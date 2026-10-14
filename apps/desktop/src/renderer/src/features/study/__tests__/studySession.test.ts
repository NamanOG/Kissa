import { describe, expect, it } from 'vitest'
import {
  advance,
  breakMs,
  extend,
  finish,
  focusMs,
  formatClock,
  isValidSession,
  pause,
  resume,
  segmentRemaining,
  startBreak,
  startFocus,
  startSession,
  STALL_MS,
  toRecord,
  type StudySession
} from '../studySession'

const MIN = 60_000
const T0 = Date.UTC(2026, 9, 14, 9, 0, 0)

/** Ticks once a second from `from` to `to`, as the engine does. */
function run(session: StudySession, from: number, to: number, step = 1000): StudySession {
  let s = session
  for (let t = from + step; t <= to; t += step) s = advance(s, t)
  return s
}

describe('study session clock', () => {
  it('counts focus time from anchors, not ticks', () => {
    let s = startSession('Read chapter 4', { focusMinutes: 25, breakMinutes: 5 }, T0, 'a')
    // A throttled or skipped tick does not lose time.
    s = advance(s, T0 + 90_000)
    expect(focusMs(s, T0 + 90_000)).toBe(90_000)
    expect(segmentRemaining(s.segment, T0 + 90_000)).toBe(25 * MIN - 90_000)
  })

  it('stops counting while paused and resumes from the same point', () => {
    let s = startSession('', { focusMinutes: 25, breakMinutes: 0 }, T0, 'a')
    s = pause(s, T0 + 5 * MIN)
    s = run(s, T0 + 5 * MIN, T0 + 15 * MIN, 30_000)
    expect(focusMs(s, T0 + 15 * MIN)).toBe(5 * MIN)
    s = resume(s, T0 + 15 * MIN)
    expect(focusMs(s, T0 + 16 * MIN)).toBe(6 * MIN)
  })

  it('ends a planned block exactly at its length and waits for the person', () => {
    let s = startSession('', { focusMinutes: 25, breakMinutes: 5 }, T0, 'a')
    s = run(s, T0, T0 + 26 * MIN, 10_000)
    expect(s.segment.ended).toBe(true)
    expect(s.focusMsDone).toBe(25 * MIN)
    expect(s.focusBlocksDone).toBe(1)
    // Time after the end is not focus time.
    expect(focusMs(s, T0 + 40 * MIN)).toBe(25 * MIN)
  })

  it('extends a block that just ended without double counting', () => {
    let s = startSession('', { focusMinutes: 25, breakMinutes: 5 }, T0, 'a')
    s = run(s, T0, T0 + 25 * MIN, 10_000)
    expect(s.segment.ended).toBe(true)
    s = extend(s, T0 + 26 * MIN)
    expect(s.segment.ended).toBe(false)
    expect(s.focusBlocksDone).toBe(0)
    expect(focusMs(s, T0 + 26 * MIN)).toBe(25 * MIN)
    s = run(s, T0 + 26 * MIN, T0 + 40 * MIN, 10_000)
    expect(s.segment.ended).toBe(true)
    expect(s.focusMsDone).toBe(35 * MIN)
  })

  it('keeps breaks separate from focus', () => {
    let s = startSession('', { focusMinutes: 25, breakMinutes: 5 }, T0, 'a')
    s = run(s, T0, T0 + 25 * MIN, 10_000)
    s = startBreak(s, T0 + 25 * MIN)
    s = run(s, T0 + 25 * MIN, T0 + 31 * MIN, 10_000)
    expect(s.segment.kind).toBe('break')
    expect(s.segment.ended).toBe(true)
    expect(breakMs(s, T0 + 31 * MIN)).toBe(5 * MIN)
    expect(focusMs(s, T0 + 31 * MIN)).toBe(25 * MIN)
    s = startFocus(s, T0 + 32 * MIN)
    expect(s.segment.kind).toBe('focus')
    expect(focusMs(s, T0 + 42 * MIN)).toBe(35 * MIN)
  })

  it('does not count sleep: freezes at the last observed moment and asks', () => {
    let s = startSession('', { focusMinutes: 50, breakMinutes: 0 }, T0, 'a')
    s = run(s, T0, T0 + 10 * MIN, 10_000)
    // The PC sleeps for two hours.
    s = advance(s, T0 + 130 * MIN)
    expect(s.interruption).not.toBeNull()
    expect(s.interruption!.awayMs).toBe(120 * MIN)
    expect(focusMs(s, T0 + 130 * MIN)).toBe(10 * MIN)
    // Still frozen until the person decides.
    s = advance(s, T0 + 131 * MIN)
    expect(focusMs(s, T0 + 131 * MIN)).toBe(10 * MIN)
    s = resume(s, T0 + 131 * MIN)
    expect(s.interruption).toBeNull()
    expect(focusMs(s, T0 + 132 * MIN)).toBe(11 * MIN)
  })

  it('a planned block that would have ended during sleep is not completed by the sleep', () => {
    let s = startSession('', { focusMinutes: 25, breakMinutes: 0 }, T0, 'a')
    s = run(s, T0, T0 + 20 * MIN, 10_000)
    s = advance(s, T0 + 90 * MIN)
    expect(s.segment.ended).toBe(false)
    expect(focusMs(s, T0 + 90 * MIN)).toBe(20 * MIN)
  })

  it('treats a clock moved backwards as an interruption rather than negative time', () => {
    let s = startSession('', { focusMinutes: null, breakMinutes: 0 }, T0, 'a')
    s = run(s, T0, T0 + 10 * MIN, 10_000)
    s = advance(s, T0 + 2 * MIN)
    expect(s.interruption).not.toBeNull()
    expect(focusMs(s, T0 + 2 * MIN)).toBeGreaterThanOrEqual(0)
  })

  it('a short gap (a slow tick) is not an interruption', () => {
    let s = startSession('', { focusMinutes: null, breakMinutes: 0 }, T0, 'a')
    s = advance(s, T0 + STALL_MS - 1000)
    expect(s.interruption).toBeNull()
  })

  it('finishing an interrupted session ends it where Kissa last saw it', () => {
    let s = startSession('Essay', { focusMinutes: null, breakMinutes: 0 }, T0, 'a')
    s = run(s, T0, T0 + 30 * MIN, 10_000)
    s = advance(s, T0 + 300 * MIN)
    const done = finish(s, T0 + 301 * MIN)
    expect(done.focusMsDone).toBe(30 * MIN)
    const record = toRecord(done, T0 + 301 * MIN, { rating: 'okay', intentionDone: true })
    expect(record).toMatchObject({ intention: 'Essay', focusMs: 30 * MIN, rating: 'okay', intentionDone: true })
  })

  it('crosses midnight without trouble', () => {
    const late = Date.UTC(2026, 9, 14, 23, 50, 0)
    let s = startSession('', { focusMinutes: 25, breakMinutes: 0 }, late, 'a')
    s = run(s, late, late + 25 * MIN, 10_000)
    expect(s.focusMsDone).toBe(25 * MIN)
    expect(s.startedAt).toBe(late)
  })

  it('rejects malformed saved sessions', () => {
    expect(isValidSession(null)).toBe(false)
    expect(isValidSession({ version: 2 })).toBe(false)
    expect(isValidSession(startSession('', { focusMinutes: 25, breakMinutes: 0 }, T0, 'a'))).toBe(true)
  })

  it('formats the clock', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(90 * MIN + 5000)).toBe('1:30:05')
  })
})
