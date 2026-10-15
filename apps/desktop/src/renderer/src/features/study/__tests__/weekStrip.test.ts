import { describe, expect, it } from 'vitest'
import { goalStreak, lastSevenDays, type SessionRecord } from '../studySession'

const H = 60 * 60_000

function record(startedAt: number, focusMs: number): SessionRecord {
  return { id: String(startedAt), intention: '', startedAt, endedAt: startedAt + focusMs, focusMs, breakMs: 0, breaks: 0, plannedFocusMinutes: 50 } as SessionRecord
}

describe('lastSevenDays', () => {
  it('sums focus per local day, oldest first, ignoring older sessions', () => {
    const now = new Date(2026, 9, 15, 20, 0).getTime()
    const at = (daysAgo: number, hour: number): number => new Date(2026, 9, 15 - daysAgo, hour, 0).getTime()
    const days = lastSevenDays([record(at(0, 9), H), record(at(0, 14), H / 2), record(at(2, 23), 2 * H), record(at(9, 10), 5 * H)], now)
    expect(days).toHaveLength(7)
    expect(days[6].focusMs).toBe(1.5 * H)
    expect(days[4].focusMs).toBe(2 * H)
    expect(days.reduce((s, d) => s + d.focusMs, 0)).toBe(3.5 * H)
  })
})

describe('goalStreak', () => {
  const day = (h: number): { focusMs: number } => ({ focusMs: h * H })
  it('counts days in a row up to today', () => {
    expect(goalStreak([day(0), day(2), day(3), day(2)], 2 * H)).toBe(3)
  })
  it('does not break the streak because today is not done yet', () => {
    expect(goalStreak([day(2), day(2), day(0.5)], 2 * H)).toBe(2)
  })
  it('is zero without a goal', () => {
    expect(goalStreak([day(5)], 0)).toBe(0)
  })
})
