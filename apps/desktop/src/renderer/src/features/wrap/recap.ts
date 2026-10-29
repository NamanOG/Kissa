import { monthOf, prepareHistory, rawMonths, readMonth, readTallies } from '@renderer/features/session/history'
import { albumKey, longestStreak, tallyOf, type PlayRow, type Tally, type TallyEntry } from '@renderer/features/session/tally'

/**
 * A recap of a week, a month or a year, added up from the local play history. Pure apart
 * from reading localStorage, and only run when a recap is opened.
 */

export type RecapKind = 'week' | 'month' | 'year'

export interface RecapPeriod {
  kind: RecapKind
  /** Local midnight at the start, inclusive. */
  start: number
  /** Local midnight after the end, exclusive. */
  end: number
  /** True while the period is still going. */
  current: boolean
}

export interface Recap {
  period: RecapPeriod
  seconds: number
  plays: number
  /** Seconds in the period before, or null when there was no history then. */
  prevSeconds: number | null
  albums: TallyEntry[]
  artists: TallyEntry[]
  songs: TallyEntry[]
  /** Different records played. */
  albumCount: number
  /** Days with music. */
  days: number
  /** Local day 'YYYY-MM-DD' to seconds heard. */
  dayMap: Record<string, number>
  /** Days in the period so far. */
  daysSoFar: number
  streak: number
  /** Seconds in each local hour. */
  hours: number[]
  peakHour: number
  room: string | null
  /** Records heard for the first time in the period. */
  newRecords: number
}

/** A recap needs at least this much music to say anything. */
export const MIN_RECAP_PLAYS = 8
export const MIN_RECAP_SECONDS = 30 * 60

export function periodFor(kind: RecapKind, now = Date.now(), offset = 0): RecapPeriod {
  const d = new Date(now)
  let start: Date
  let end: Date
  if (kind === 'week') {
    // Weeks start on Monday.
    const day = (d.getDay() + 6) % 7
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + offset * 7)
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  } else if (kind === 'month') {
    start = new Date(d.getFullYear(), d.getMonth() + offset, 1)
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  } else {
    start = new Date(d.getFullYear() + offset, 0, 1)
    end = new Date(start.getFullYear() + 1, 0, 1)
  }
  return { kind, start: start.getTime(), end: end.getTime(), current: now >= start.getTime() && now < end.getTime() }
}

function monthsBetween(start: number, end: number): string[] {
  const out: string[] = []
  const d = new Date(start)
  let m = new Date(d.getFullYear(), d.getMonth(), 1)
  while (m.getTime() < end) {
    out.push(monthOf(m.getTime()))
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
  }
  return out
}

/** The rows and stored month tallies that fall inside a period. */
function gather(p: RecapPeriod): { rows: PlayRow[]; tallies: Tally[]; any: boolean } {
  prepareHistory()
  const raw = new Set(rawMonths())
  const stored = readTallies()
  const rows: PlayRow[] = []
  const tallies: Tally[] = []
  let any = false
  for (const m of monthsBetween(p.start, p.end)) {
    if (raw.has(m)) {
      for (const r of readMonth(m)) {
        if (r[0] >= p.start && r[0] < p.end) {
          rows.push(r)
          any = true
        }
      }
    } else if (stored[m]) {
      // A folded month only counts whole; folded months are always older than any week.
      const [y, mo] = m.split('-').map(Number)
      if (new Date(y, mo - 1, 1).getTime() >= p.start && new Date(y, mo, 1).getTime() <= p.end) {
        tallies.push(stored[m])
        any = true
      }
    }
  }
  return { rows, tallies, any }
}

export function buildRecap(
  kind: RecapKind,
  now = Date.now(),
  offset = 0,
  shelf: { album: string; artist: string; firstListened: number }[] = []
): Recap {
  const period = periodFor(kind, now, offset)
  const { rows, tallies } = gather(period)
  const t = tallyOf(rows, tallies)
  const prev = gather(periodFor(kind, now, offset - 1))
  const prevSeconds = prev.any ? tallyOf(prev.rows, prev.tallies).seconds : null
  const dayKeys = Object.keys(t.days)
  const peakHour = t.hours.reduce((best, s, h) => (s > t.hours[best] ? h : best), 0)
  const room = Object.entries(t.rooms).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const lastDay = new Date(Math.min(period.end - 1, now))
  lastDay.setHours(0, 0, 0, 0)
  const daysSoFar = Math.max(1, Math.round((lastDay.getTime() - period.start) / 86_400_000) + 1)
  // New: records played in the period that the Shelf first met in the period.
  const played = new Set(t.albums.map((a) => a.k))
  const seen = new Set<string>()
  let newRecords = 0
  for (const r of shelf) {
    const k = albumKey(r.album, r.artist)
    if (seen.has(k) || !played.has(k)) continue
    seen.add(k)
    if (r.firstListened >= period.start && r.firstListened < period.end) newRecords++
  }
  return {
    period,
    seconds: t.seconds,
    plays: t.plays,
    prevSeconds,
    albums: t.albums.slice(0, 5),
    artists: t.artists.slice(0, 5),
    songs: t.songs.slice(0, 5),
    albumCount: t.albums.length,
    days: dayKeys.length,
    dayMap: t.days,
    daysSoFar,
    streak: longestStreak(dayKeys),
    hours: t.hours,
    peakHour,
    room,
    newRecords
  }
}

export function hasEnough(r: Recap): boolean {
  return r.plays >= MIN_RECAP_PLAYS && r.seconds >= MIN_RECAP_SECONDS
}

/** When most of the listening happens. */
export type ListenTime = 'morning' | 'afternoon' | 'evening' | 'night'

export function listenTime(hours: number[]): ListenTime {
  const sum = (from: number, to: number): number => {
    let s = 0
    for (let h = from; h !== to; h = (h + 1) % 24) s += hours[h] ?? 0
    return s
  }
  const parts: [ListenTime, number][] = [
    ['morning', sum(5, 12)],
    ['afternoon', sum(12, 17)],
    ['evening', sum(17, 22)],
    ['night', sum(22, 5)]
  ]
  return parts.sort((a, b) => b[1] - a[1])[0][0]
}
