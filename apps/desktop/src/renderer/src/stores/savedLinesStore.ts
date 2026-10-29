import { create } from 'zustand'

/** A lyric line the listener kept, like underlining a sentence in a book. */
export interface SavedLine {
  id: string
  text: string
  title: string
  artist: string
  album: string
  savedAt: number
}

const KEY = 'kissa_saved_lines_v1'
const LIMIT = 500

export function savedLineId(title: string, artist: string, text: string): string {
  return `${title}\u0000${artist}\u0000${text.trim()}`.toLowerCase()
}

function read(): SavedLine[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown
    return Array.isArray(rows)
      ? rows.filter((r): r is SavedLine => !!r && typeof r.id === 'string' && typeof r.text === 'string')
      : []
  } catch {
    return []
  }
}

function write(lines: SavedLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // Not saved; kept for this session.
  }
}

interface SavedLinesState {
  lines: SavedLine[]
  isSaved: (id: string) => boolean
  /** Keeps the line, or lets it go if it was kept. Returns true when it is now kept. */
  toggle: (line: Omit<SavedLine, 'id' | 'savedAt'>) => boolean
  remove: (id: string) => void
}

export const useSavedLinesStore = create<SavedLinesState>((set, get) => ({
  lines: read(),
  isSaved: (id) => get().lines.some((l) => l.id === id),
  toggle: (line) => {
    const text = line.text.trim().slice(0, 300)
    if (!text) return false
    const id = savedLineId(line.title, line.artist, text)
    const existing = get().lines
    if (existing.some((l) => l.id === id)) {
      const lines = existing.filter((l) => l.id !== id)
      write(lines)
      set({ lines })
      return false
    }
    const lines = [{ ...line, text, id, savedAt: Date.now() }, ...existing].slice(0, LIMIT)
    write(lines)
    set({ lines })
    return true
  },
  remove: (id) => {
    const lines = get().lines.filter((l) => l.id !== id)
    write(lines)
    set({ lines })
  }
}))
