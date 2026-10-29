/**
 * Adds up plays: time and plays per record, artist and song, by day, by hour and by room.
 * The same shape holds a whole finished month in a few kilobytes, so a year of listening
 * stays small, and a recap is the sum of the months (and raw rows) it covers.
 */

/** [startedAt ms, title, artist, album, seconds heard, room id?] */
export type PlayRow = [number, string, string, string, number] | [number, string, string, string, number, string]

export interface TallyEntry {
  /** Lower-case key. */
  k: string
  /** Album, artist or song title. */
  a: string
  /** The artist, for records and songs. */
  b?: string
  /** Seconds heard. */
  s: number
  /** Plays. */
  p: number
}

export interface Tally {
  seconds: number
  plays: number
  albums: TallyEntry[]
  artists: TallyEntry[]
  songs: TallyEntry[]
  /** Local day 'YYYY-MM-DD' to seconds heard. */
  days: Record<string, number>
  /** Seconds heard in each local hour, 0 to 23. */
  hours: number[]
  /** Room id to seconds heard. */
  rooms: Record<string, number>
}

/** How many entries a stored month keeps per list: plenty for a top five of a year. */
export const KEEP_ENTRIES = 80

export function emptyTally(): Tally {
  return { seconds: 0, plays: 0, albums: [], artists: [], songs: [], days: {}, hours: new Array(24).fill(0), rooms: {} }
}

const norm = (s: string): string => s.trim().toLowerCase()

export function dayOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function albumKey(album: string, artist: string): string {
  return `${norm(album)}\u0001${norm(artist)}`
}

class Builder {
  seconds = 0
  plays = 0
  albums = new Map<string, TallyEntry>()
  artists = new Map<string, TallyEntry>()
  songs = new Map<string, TallyEntry>()
  days: Record<string, number> = {}
  hours: number[] = new Array(24).fill(0)
  rooms: Record<string, number> = {}

  private bump(map: Map<string, TallyEntry>, k: string, a: string, b: string | undefined, s: number, p: number): void {
    const e = map.get(k)
    if (e) {
      e.s += s
      e.p += p
    } else map.set(k, b === undefined ? { k, a, s, p } : { k, a, b, s, p })
  }

  row(r: PlayRow): void {
    const [at, title, artist, album, s, room] = r
    if (!(s > 0)) return
    this.seconds += s
    this.plays += 1
    if (album) this.bump(this.albums, albumKey(album, artist), album, artist, s, 1)
    if (artist) this.bump(this.artists, norm(artist), artist, undefined, s, 1)
    if (title) this.bump(this.songs, `${norm(title)}\u0001${norm(artist)}`, title, artist, s, 1)
    const day = dayOf(at)
    this.days[day] = (this.days[day] ?? 0) + s
    this.hours[new Date(at).getHours()] += s
    if (room) this.rooms[room] = (this.rooms[room] ?? 0) + s
  }

  tally(t: Tally): void {
    this.seconds += t.seconds
    this.plays += t.plays
    for (const e of t.albums) this.bump(this.albums, e.k, e.a, e.b, e.s, e.p)
    for (const e of t.artists) this.bump(this.artists, e.k, e.a, undefined, e.s, e.p)
    for (const e of t.songs) this.bump(this.songs, e.k, e.a, e.b, e.s, e.p)
    for (const [d, s] of Object.entries(t.days)) this.days[d] = (this.days[d] ?? 0) + s
    t.hours.forEach((s, h) => (this.hours[h] += s))
    for (const [r, s] of Object.entries(t.rooms)) this.rooms[r] = (this.rooms[r] ?? 0) + s
  }

  done(keep: number): Tally {
    const top = (m: Map<string, TallyEntry>): TallyEntry[] =>
      [...m.values()].sort((x, y) => y.p - x.p || y.s - x.s).slice(0, keep)
    return {
      seconds: Math.round(this.seconds),
      plays: this.plays,
      albums: top(this.albums),
      artists: top(this.artists),
      songs: top(this.songs),
      days: this.days,
      hours: this.hours.map(Math.round),
      rooms: this.rooms
    }
  }
}

/** Adds up raw rows and stored tallies together. Lists come back most played first. */
export function tallyOf(rows: PlayRow[], tallies: Tally[] = [], keep = Infinity): Tally {
  const b = new Builder()
  for (const t of tallies) b.tally(t)
  for (const r of rows) b.row(r)
  return b.done(keep)
}

/** Days in a row with music, the longest run among the given days. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort()
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const d of sorted) {
    const [y, m, dd] = d.split('-').map(Number)
    const t = Date.UTC(y, m - 1, dd) / 86_400_000
    run = prev !== null && t - prev === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}
