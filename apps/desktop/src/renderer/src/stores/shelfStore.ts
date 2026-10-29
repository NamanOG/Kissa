import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TrackInfo } from './playerStore'
import { createDeferredStorage } from '../utils/deferredStorage'
import { knownSmallCover, needsShrink, shrinkCoverLater } from './shelfCovers'

export interface RecordEntry {
  albumKey: string // Normalized "album-artist"
  album: string
  artist: string
  artworkUrl?: string
  firstListened: number
  lastListened: number
  playCount: number
  tracksEncountered: string[]
}

export interface ShelfState {
  records: RecordEntry[]
  addOrUpdateRecord: (track: TrackInfo) => void
  repairArtwork: (track: TrackInfo) => void
  removeRecord: (albumKey: string) => void
  clearShelf: () => void
}

function normalizeKey(album: string, artist: string): string {
  return `${album.trim().toLowerCase()}-${artist.trim().toLowerCase()}`
}

/**
 * The placeholder shown on the deck when nothing is playing ("Kissa — Listening
 * Room"). It is not something the user listened to, so it never belongs on the shelf.
 */
export const IDLE_SOURCE_APP_ID = 'kissa-idle'
const IDLE_RECORD_KEY = normalizeKey('Kissa', 'Listening Room')

const BROWSER_SOURCE =
  /chrome|msedge|edge|firefox|brave|opera|vivaldi|comet|youtube|(^|[^a-z])(arc|browser)([^a-z]|$)/i

/** Tabs and streams are not records: the shelf and its stats are for music players. */
export function isBrowserTrack(track: Pick<TrackInfo, 'source' | 'sourceAppId'>): boolean {
  return BROWSER_SOURCE.test(track.sourceAppId ?? '') || BROWSER_SOURCE.test(track.source ?? '')
}

// Small cover copies arrive a moment after the listen; apply them together.
const coverPatches = new Map<string, string>()
let coverPatchTimer: ReturnType<typeof setTimeout> | undefined

function patchCover(source: string, small: string): void {
  coverPatches.set(source, small)
  if (coverPatchTimer !== undefined) return
  coverPatchTimer = setTimeout(() => {
    coverPatchTimer = undefined
    const patches = new Map(coverPatches)
    coverPatches.clear()
    useShelfStore.setState((state) => {
      let changed = false
      const records = state.records.map((r) => {
        const small = r.artworkUrl ? patches.get(r.artworkUrl) : undefined
        if (!small) return r
        changed = true
        return { ...r, artworkUrl: small }
      })
      return changed ? { records } : state
    })
  }, 200)
}

/** Shelves saved before covers were kept small: shrink their big covers once, quietly. */
function shrinkSavedCovers(): void {
  const urls = [
    ...new Set(useShelfStore.getState().records.map((r) => r.artworkUrl).filter(needsShrink))
  ]
  let i = 0
  const next = (): void => {
    const url = urls[i++]
    if (!url) return
    shrinkCoverLater(url, patchCover)
    setTimeout(next, 250)
  }
  next()
}

export const useShelfStore = create<ShelfState>()(
  persist(
    (set) => ({
      records: [],
      // The current cover has passed the main-process ArtworkService/coverMatch path.
      // Update old shelf art without recording an extra listen or changing recency.
      repairArtwork: (track) => {
        let stored = false
        set((state) => {
          if (
            !track.album ||
            !track.artist ||
            !track.artworkUrl ||
            (!track.artworkUrl.startsWith('data:image/') &&
              !track.artworkUrl.startsWith('https://')) ||
            track.sourceAppId === IDLE_SOURCE_APP_ID ||
            isBrowserTrack(track)
          )
            return state
          const key = normalizeKey(track.album, track.artist)
          const index = state.records.findIndex((r) => r.albumKey === key)
          const cover = knownSmallCover(track.artworkUrl)
          if (index < 0 || state.records[index].artworkUrl === cover) return state
          const records = [...state.records]
          records[index] = { ...records[index], artworkUrl: cover }
          stored = true
          return { records }
        })
        if (stored) shrinkCoverLater(track.artworkUrl, patchCover)
      },
      addOrUpdateRecord: (track) => {
        let stored = false
        set((state) => {
          if (!track.album || !track.artist) return state // Ignore incomplete metadata
          if (track.sourceAppId === IDLE_SOURCE_APP_ID) return state // Not a real listen
          // A browser tab or video with no artist is not a record.
          if (track.artist.trim().toLowerCase() === 'unknown artist') return state
          if (isBrowserTrack(track)) return state

          const key = normalizeKey(track.album, track.artist)
          const existingIdx = state.records.findIndex((r) => r.albumKey === key)
          const now = Date.now()
          const cover = knownSmallCover(track.artworkUrl)
          stored = true

          if (existingIdx !== -1) {
            const existing = state.records[existingIdx]
            const isNewTrack = !existing.tracksEncountered.includes(track.title)

            const updated = {
              ...existing,
              lastListened: now,
              playCount: existing.playCount + 1,
              artworkUrl: cover ?? existing.artworkUrl,
              tracksEncountered: isNewTrack
                ? [...existing.tracksEncountered, track.title]
                : existing.tracksEncountered
            }

            const newRecords = [...state.records]
            newRecords[existingIdx] = updated
            return { records: newRecords }
          } else {
            const newRecord: RecordEntry = {
              albumKey: key,
              album: track.album,
              artist: track.artist,
              artworkUrl: cover,
              firstListened: now,
              lastListened: now,
              playCount: 1,
              tracksEncountered: [track.title]
            }
            return { records: [...state.records, newRecord] }
          }
        })
        if (stored) shrinkCoverLater(track.artworkUrl, patchCover)
      },
      removeRecord: (albumKey) =>
        set((state) => ({
          records: state.records.filter((r) => r.albumKey !== albumKey)
        })),
      clearShelf: () => set({ records: [] })
    }),
    {
      name: 'kissa-record-shelf', // Persists to localStorage automatically
      version: 2,
      // Saving the whole shelf on every song change froze the window; save once things settle.
      storage: createDeferredStorage<ShelfState>(),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') setTimeout(shrinkSavedCovers, 5000)
      },
      // v0 shelves recorded the idle placeholder as an album; v1 recorded browser
      // streams with no artist. Drop both.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<ShelfState>
        return {
          ...state,
          records: (state.records ?? []).filter(
            (r) =>
              r.albumKey !== IDLE_RECORD_KEY && r.artist.trim().toLowerCase() !== 'unknown artist'
          )
        } as ShelfState
      }
    }
  )
)
