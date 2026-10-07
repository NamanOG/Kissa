import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TrackInfo } from './playerStore'

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

const BROWSER_SOURCE = /chrome|msedge|edge|firefox|brave|opera|vivaldi|comet|youtube|(^|[^a-z])(arc|browser)([^a-z]|$)/i

/** Tabs and streams are not records: the shelf and its stats are for music players. */
export function isBrowserTrack(track: Pick<TrackInfo, 'source' | 'sourceAppId'>): boolean {
  return BROWSER_SOURCE.test(track.sourceAppId ?? '') || BROWSER_SOURCE.test(track.source ?? '')
}

export const useShelfStore = create<ShelfState>()(
  persist(
    (set) => ({
      records: [],
      addOrUpdateRecord: (track) => set((state) => {
        if (!track.album || !track.artist) return state // Ignore incomplete metadata
        if (track.sourceAppId === IDLE_SOURCE_APP_ID) return state // Not a real listen
        // A browser tab or video with no artist is not a record.
        if (track.artist.trim().toLowerCase() === 'unknown artist') return state
        if (isBrowserTrack(track)) return state
        
        const key = normalizeKey(track.album, track.artist)
        const existingIdx = state.records.findIndex((r) => r.albumKey === key)
        const now = Date.now()

        if (existingIdx !== -1) {
          const existing = state.records[existingIdx]
          const isNewTrack = !existing.tracksEncountered.includes(track.title)
          
          const updated = {
            ...existing,
            lastListened: now,
            playCount: existing.playCount + 1,
            artworkUrl: track.artworkUrl ?? existing.artworkUrl,
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
            artworkUrl: track.artworkUrl,
            firstListened: now,
            lastListened: now,
            playCount: 1,
            tracksEncountered: [track.title]
          }
          return { records: [...state.records, newRecord] }
        }
      }),
      removeRecord: (albumKey) => set((state) => ({
        records: state.records.filter(r => r.albumKey !== albumKey)
      })),
      clearShelf: () => set({ records: [] })
    }),
    {
      name: 'kissa-record-shelf', // Persists to localStorage automatically
      version: 2,
      // v0 shelves recorded the idle placeholder as an album; v1 recorded browser
      // streams with no artist. Drop both.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<ShelfState>
        return {
          ...state,
          records: (state.records ?? []).filter(
            (r) => r.albumKey !== IDLE_RECORD_KEY && r.artist.trim().toLowerCase() !== 'unknown artist'
          )
        } as ShelfState
      }
    }
  )
)
