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
  clearShelf: () => void
}

function normalizeKey(album: string, artist: string): string {
  return `${album.trim().toLowerCase()}-${artist.trim().toLowerCase()}`
}

export const useShelfStore = create<ShelfState>()(
  persist(
    (set) => ({
      records: [],
      addOrUpdateRecord: (track) => set((state) => {
        if (!track.album || !track.artist) return state // Ignore incomplete metadata
        
        const key = normalizeKey(track.album, track.artist)
        const existingIdx = state.records.findIndex((r) => r.albumKey === key)
        const now = Date.now()

        if (existingIdx !== -1) {
          // Update existing
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
          // Add new record
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
      clearShelf: () => set({ records: [] })
    }),
    {
      name: 'kissa-record-shelf' // Persists to localStorage automatically
    }
  )
)
