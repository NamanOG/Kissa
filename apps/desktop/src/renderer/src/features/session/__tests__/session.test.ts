import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionTracker, SESSION_GAP_MS } from '../sessionTracker'
import { isClosingMoment } from '../useClosingTime'
import {
  appendPlay,
  flushHistory,
  foldOldMonths,
  readHistory,
  readTallies,
  resetHistoryMemory,
  HISTORY_KEY,
  MONTH_PREFIX
} from '../history'
import { daylightAt } from '../../background/daylight'

const A = { title: 'So What', artist: 'Miles Davis', album: 'Kind of Blue', artwork: 'data:image/png;base64,a' }
const B = { title: 'Blue in Green', artist: 'Miles Davis', album: 'Kind of Blue', artwork: 'data:image/png;base64,a' }
const C = { title: 'Naima', artist: 'John Coltrane', album: 'Giant Steps', artwork: 'data:image/png;base64,c' }

function play(tracker: SessionTracker, from: number, seconds: number, track: typeof A): number {
  let t = from
  for (let i = 0; i <= seconds; i++, t += 1000) tracker.tick(t, true, track)
  return t
}

describe('SessionTracker', () => {
  it('records songs heard for 30 seconds and sums up a long session', () => {
    const rows: unknown[] = []
    const tracker = new SessionTracker((row) => rows.push(row))
    let t = play(tracker, 0, 400, A)
    t = play(tracker, t, 20, B) // too short to count
    t = play(tracker, t, 300, C)
    let summary = null
    for (let i = 0; i <= SESSION_GAP_MS / 1000 + 1 && !summary; i++, t += 1000) summary = tracker.tick(t, false, C)
    expect(rows).toHaveLength(2)
    expect(summary).toEqual({ minutes: 12, songs: 2, albums: 2, covers: ['data:image/png;base64,a', 'data:image/png;base64,c'] })
  })

  it('ends a short session quietly', () => {
    const tracker = new SessionTracker(() => undefined)
    let t = play(tracker, 0, 120, A)
    let summary = null
    for (let i = 0; i <= SESSION_GAP_MS / 1000 + 1; i++, t += 1000) summary = summary ?? tracker.tick(t, false, A)
    expect(summary).toBeNull()
  })

  it('treats a short pause as the same session', () => {
    const tracker = new SessionTracker(() => undefined)
    let t = play(tracker, 0, 400, A)
    for (let i = 0; i < 30; i++, t += 1000) expect(tracker.tick(t, false, A)).toBeNull()
    t = play(tracker, t, 300, A)
    let summary = null
    for (let i = 0; i <= SESSION_GAP_MS / 1000 + 1 && !summary; i++, t += 1000) summary = tracker.tick(t, false, A)
    expect(summary?.minutes).toBe(12)
  })
})

describe('local history', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHistoryMemory()
  })
  it('keeps rows of 30 seconds or more', () => {
    appendPlay([1, 'a', 'b', 'c', 10])
    appendPlay([2, 'a', 'b', 'c', 45.4])
    expect(readHistory()).toEqual([[2, 'a', 'b', 'c', 45]])
  })
  it('stores each month under its own key and records the room', () => {
    const oct = new Date(2026, 9, 3, 21).getTime()
    appendPlay([oct, 'So What', 'Miles Davis', 'Kind of Blue', 300, 'jazz-bar'])
    flushHistory()
    expect(JSON.parse(localStorage.getItem(MONTH_PREFIX + '2026-10') ?? '[]')).toEqual([
      [oct, 'So What', 'Miles Davis', 'Kind of Blue', 300, 'jazz-bar']
    ])
  })
  it('moves the first version into months', () => {
    const at = new Date(2026, 9, 27, 20).getTime()
    localStorage.setItem(HISTORY_KEY, JSON.stringify([[at, 'a', 'b', 'c', 60]]))
    appendPlay([at + 1000, 'd', 'e', 'f', 60])
    flushHistory()
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    expect(readHistory().map((r) => r[1])).toEqual(['a', 'd'])
  })
  it('folds months older than the last three into small tallies', () => {
    const june = new Date(2026, 5, 10, 22).getTime()
    appendPlay([june, 'Naima', 'John Coltrane', 'Giant Steps', 200])
    appendPlay([june + 1000, 'Naima', 'John Coltrane', 'Giant Steps', 100])
    flushHistory()
    foldOldMonths(new Date(2026, 9, 29).getTime())
    expect(localStorage.getItem(MONTH_PREFIX + '2026-06')).toBeNull()
    const t = readTallies()['2026-06']
    expect(t.seconds).toBe(300)
    expect(t.albums[0]).toMatchObject({ a: 'Giant Steps', b: 'John Coltrane', p: 2, s: 300 })
    expect(t.hours[22]).toBe(300)
  })
})

describe('closing time', () => {
  it('runs in the first half hour of the hour, once a day', () => {
    const at = (h: number, m: number): Date => new Date(2026, 9, 27, h, m)
    expect(isClosingMoment(at(23, 5), 23, null)).toBe(true)
    expect(isClosingMoment(at(23, 40), 23, null)).toBe(false)
    expect(isClosingMoment(at(22, 59), 23, null)).toBe(false)
    expect(isClosingMoment(at(23, 5), 23, at(23, 1).toDateString())).toBe(false)
  })
})

describe('daylight', () => {
  it('is neutral at midday, warm in the evening, cool in the morning', () => {
    const at = (h: number, m = 0): Date => new Date(2026, 9, 27, h, m)
    expect(daylightAt(at(13))).toEqual({ warm: 0, cool: 0, dim: 0 })
    expect(daylightAt(at(19, 30)).warm).toBeGreaterThan(0.6)
    expect(daylightAt(at(8)).cool).toBeGreaterThan(0.2)
    expect(daylightAt(at(2)).dim).toBeGreaterThan(0.1)
  })
  it('changes smoothly', () => {
    const a = daylightAt(new Date(2026, 9, 27, 17, 0))
    const b = daylightAt(new Date(2026, 9, 27, 17, 1))
    expect(Math.abs(a.warm - b.warm)).toBeLessThan(0.02)
  })
})

