import { beforeEach, describe, expect, it } from 'vitest'
import { appendPlay, flushHistory, foldOldMonths, resetHistoryMemory } from '@renderer/features/session/history'
import { longestStreak } from '@renderer/features/session/tally'
import { buildRecap, hasEnough, listenTime, periodFor } from '../recap'

const at = (m: number, d: number, h = 21): number => new Date(2026, m, d, h).getTime()

describe('recap periods', () => {
  it('starts weeks on Monday and months on the first', () => {
    const thu = new Date(2026, 9, 29, 15).getTime()
    const w = periodFor('week', thu)
    expect(new Date(w.start)).toEqual(new Date(2026, 9, 26))
    expect(new Date(w.end)).toEqual(new Date(2026, 10, 2))
    expect(w.current).toBe(true)
    expect(new Date(periodFor('month', thu, -1).start)).toEqual(new Date(2026, 8, 1))
    expect(new Date(periodFor('year', thu).end)).toEqual(new Date(2027, 0, 1))
  })
})

describe('buildRecap', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHistoryMemory()
  })

  it('adds up the month: top records, days, streak, hours, room and the month before', () => {
    appendPlay([at(8, 20), 'Naima', 'John Coltrane', 'Giant Steps', 600])
    for (const d of [3, 4, 5, 9]) {
      appendPlay([at(9, d), 'So What', 'Miles Davis', 'Kind of Blue', 540, 'jazz-bar'])
      appendPlay([at(9, d, 23), 'Blue in Green', 'Miles Davis', 'Kind of Blue', 330, 'jazz-bar'])
    }
    appendPlay([at(9, 9, 8), 'Naima', 'John Coltrane', 'Giant Steps', 260, 'sunday-morning'])
    flushHistory()
    const r = buildRecap('month', at(9, 29), 0, [
      { album: 'Kind of Blue', artist: 'Miles Davis', firstListened: at(9, 3) },
      { album: 'Giant Steps', artist: 'John Coltrane', firstListened: at(8, 20) }
    ])
    expect(r.plays).toBe(9)
    expect(r.seconds).toBe(4 * 870 + 260)
    expect(r.prevSeconds).toBe(600)
    expect(r.albums[0]).toMatchObject({ a: 'Kind of Blue', p: 8 })
    expect(r.artists[0].a).toBe('Miles Davis')
    expect(r.days).toBe(4)
    expect(r.streak).toBe(3)
    expect(r.daysSoFar).toBe(29)
    expect(r.room).toBe('jazz-bar')
    expect(r.newRecords).toBe(1)
    expect(r.peakHour).toBe(21)
    expect(listenTime(r.hours)).toBe('evening')
    expect(hasEnough(r)).toBe(true)
  })

  it('counts folded months in a year', () => {
    appendPlay([at(2, 4), 'Naima', 'John Coltrane', 'Giant Steps', 1200])
    flushHistory()
    foldOldMonths(at(9, 29))
    appendPlay([at(9, 2), 'So What', 'Miles Davis', 'Kind of Blue', 600])
    flushHistory()
    const r = buildRecap('year', at(9, 29))
    expect(r.seconds).toBe(1800)
    expect(r.albums.map((a) => a.a)).toEqual(['Giant Steps', 'Kind of Blue'])
    expect(r.prevSeconds).toBeNull()
  })

  it('says there is not enough when little was played', () => {
    appendPlay([at(9, 2), 'So What', 'Miles Davis', 'Kind of Blue', 60])
    flushHistory()
    expect(hasEnough(buildRecap('week', at(9, 3)))).toBe(false)
  })
})

describe('longestStreak', () => {
  it('finds the longest run across months', () => {
    expect(longestStreak(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05'])).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})
