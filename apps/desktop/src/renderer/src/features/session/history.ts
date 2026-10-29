import { KEEP_ENTRIES, tallyOf, type PlayRow, type Tally } from './tally'

/**
 * A private, local record of what was played: one row per song heard for at least 30
 * seconds. It never leaves the PC; the recaps read it.
 *
 * Rows are kept by month (one localStorage key each), so saving a song only rewrites the
 * current month, and only when the window is idle. Months older than the last three are
 * folded into a small tally (top records, artists and songs, days, hours, rooms), so a
 * year of listening stays a few hundred kilobytes.
 */
export type { PlayRow } from './tally'

/** The first version kept every row under one key; it is moved into months once. */
export const HISTORY_KEY = 'kissa_history_v1'
export const MONTH_PREFIX = 'kissa_plays_'
export const TALLIES_KEY = 'kissa_play_months_v1'
/** Months kept row by row (this one and the two before it); older ones become tallies. */
export const RAW_MONTHS = 3
/** A month never holds more rows than this (about 200 songs a day). */
export const MONTH_LIMIT = 6000
/** Tallies older than this many months are dropped. */
export const TALLY_MONTHS = 26
export const MIN_SECONDS = 30

export function monthOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function validRows(rows: unknown): PlayRow[] {
  return Array.isArray(rows)
    ? (rows.filter((r) => Array.isArray(r) && (r.length === 5 || r.length === 6) && typeof r[0] === 'number') as PlayRow[])
    : []
}

/** Months that have rows, oldest first. */
export function rawMonths(): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(MONTH_PREFIX)) out.push(k.slice(MONTH_PREFIX.length))
    }
  } catch {
    // Storage blocked: no history.
  }
  if (cache && !out.includes(cache.month)) out.push(cache.month)
  return out.sort()
}

export function readMonth(month: string): PlayRow[] {
  if (cache && cache.month === month) return cache.rows
  return validRows(readJson<unknown>(MONTH_PREFIX + month, []))
}

export function readTallies(): Record<string, Tally> {
  const t = readJson<Record<string, Tally>>(TALLIES_KEY, {})
  return t && typeof t === 'object' ? t : {}
}

/** Every row still kept month by month, oldest first. */
export function readHistory(): PlayRow[] {
  return rawMonths().flatMap((m) => readMonth(m))
}

// The month being written, kept in memory so a new song does not re-read it.
let cache: { month: string; rows: PlayRow[] } | null = null
let dirty = false
let timer: ReturnType<typeof setTimeout> | undefined
let listening = false

export function flushHistory(): void {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
  if (!dirty || !cache) return
  dirty = false
  try {
    localStorage.setItem(MONTH_PREFIX + cache.month, JSON.stringify(cache.rows))
  } catch {
    // Storage full or blocked: these songs simply are not remembered.
  }
}

function scheduleFlush(): void {
  if (typeof window !== 'undefined' && !listening) {
    listening = true
    window.addEventListener('pagehide', flushHistory)
    window.addEventListener('beforeunload', flushHistory)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushHistory()
    })
  }
  if (timer !== undefined) return
  timer = setTimeout(() => {
    timer = undefined
    const idle = (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback
    if (idle) idle(() => flushHistory(), { timeout: 2000 })
    else flushHistory()
  }, 1500)
}

function addRows(rows: PlayRow[]): void {
  for (const row of rows) {
    const month = monthOf(row[0])
    if (!cache || cache.month !== month) {
      flushHistory()
      cache = { month, rows: validRows(readJson<unknown>(MONTH_PREFIX + month, [])) }
    }
    cache.rows.push(row)
    if (cache.rows.length > MONTH_LIMIT) cache.rows = cache.rows.slice(-MONTH_LIMIT)
    dirty = true
  }
}

/** Moves the rows kept under the first version's single key into months. */
function migrateFirstVersion(): void {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(HISTORY_KEY)
  } catch {
    return
  }
  if (raw === null) return
  const rows = validRows(readJson<unknown>(HISTORY_KEY, [])).sort((a, b) => a[0] - b[0])
  addRows(rows)
  flushHistory()
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // Left for next time.
  }
}

/** Folds months older than the last RAW_MONTHS into tallies and drops very old tallies. */
export function foldOldMonths(now = Date.now()): void {
  const d = new Date(now)
  const oldestRaw = monthOf(new Date(d.getFullYear(), d.getMonth() - (RAW_MONTHS - 1), 1).getTime())
  const oldestTally = monthOf(new Date(d.getFullYear(), d.getMonth() - TALLY_MONTHS, 1).getTime())
  flushHistory()
  const old = rawMonths().filter((m) => m < oldestRaw)
  const tallies = readTallies()
  const stale = Object.keys(tallies).filter((m) => m < oldestTally)
  if (old.length === 0 && stale.length === 0) return
  for (const m of old) {
    tallies[m] = tallyOf(readMonth(m), tallies[m] ? [tallies[m]] : [], KEEP_ENTRIES)
  }
  for (const m of stale) delete tallies[m]
  try {
    localStorage.setItem(TALLIES_KEY, JSON.stringify(tallies))
    for (const m of old) {
      localStorage.removeItem(MONTH_PREFIX + m)
      if (cache?.month === m) cache = null
    }
  } catch {
    // Kept as rows; folded next time.
  }
}

let started = false

/** Moves old data into its current shape. Runs once, before the first read or write. */
export function prepareHistory(now = Date.now()): void {
  if (started) return
  started = true
  migrateFirstVersion()
  foldOldMonths(now)
}

export function appendPlay(row: PlayRow): void {
  if (!(row[4] >= MIN_SECONDS)) return
  prepareHistory(row[0])
  const base: [number, string, string, string, number] = [row[0], row[1].slice(0, 200), row[2].slice(0, 200), row[3].slice(0, 200), Math.round(row[4])]
  const clean: PlayRow = row[5] ? [...base, String(row[5]).slice(0, 40)] : base
  const before = cache?.month
  addRows([clean])
  if (before && before !== cache?.month) foldOldMonths(row[0])
  scheduleFlush()
}

/** For tests: forget what is held in memory and run the start-up work again. */
export function resetHistoryMemory(): void {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
  cache = null
  dirty = false
  started = false
}
