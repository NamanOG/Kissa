import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaybackClock } from '../PlaybackClock'
import { greetingFor, possessive } from '../greeting'

describe('PlaybackClock.syncSmtc', () => {
  let now = 0

  beforeEach(() => {
    now = 1_000_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    PlaybackClock.setAudioElement(null)
    PlaybackClock.setMode(true)
    PlaybackClock.setSmtcState(10, true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const advance = (ms: number): void => {
    now += ms
  }

  /** Feed reports every 200ms for `seconds`, from a source whose true position is `truth()`. */
  const play = (seconds: number, report: (truth: number) => number, truthAtStart: number): void => {
    const startedAt = now
    for (let elapsed = 200; elapsed <= seconds * 1000; elapsed += 200) {
      now = startedAt + elapsed
      PlaybackClock.syncSmtc(report(truthAtStart + elapsed / 1000))
    }
  }

  it('runs on between reports without being touched', () => {
    advance(2500)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(12.5, 3)
  })

  it('stays put when a precise source agrees with it', () => {
    play(4, (truth) => truth, 10)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(14, 2)
  })

  it('jumps to a report that is far away (a seek), once the next report carries on from it', () => {
    advance(1000)
    expect(PlaybackClock.syncSmtc(95)).toBe('none')
    advance(1000)
    expect(PlaybackClock.syncSmtc(96)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(96, 3)
  })

  it('does not follow a single premature report ahead of the music (Apple Music at a song start)', () => {
    play(3, (truth) => truth, 10)
    advance(100)
    // 1.4 s ahead, then the source stalls there while the music catches up.
    PlaybackClock.syncSmtc(14.5)
    advance(100)
    PlaybackClock.syncSmtc(14.5)
    expect(PlaybackClock.getCurrentTime()).toBeLessThan(13.5)
  })

  it('jumps back to the start when the track restarts, once the next report confirms it', () => {
    advance(8000)
    expect(PlaybackClock.syncSmtc(0.2)).toBe('none')
    advance(1000)
    expect(PlaybackClock.syncSmtc(1.2)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(1.2, 3)
  })

  it('ignores a single stale report far behind it (it would put the lyrics a line back)', () => {
    play(5, (truth) => truth, 10)
    advance(100)
    expect(PlaybackClock.syncSmtc(12.5)).toBe('none')
    advance(900)
    // The next report carries on from the real place, not from the stale one.
    expect(PlaybackClock.syncSmtc(16.0)).not.toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(16.0, 1)
  })

  it('keeps time through a source that stalls for seconds', () => {
    play(3, (truth) => truth, 10)
    // The source keeps saying 13.0 for three seconds while the music plays on.
    for (let i = 0; i < 6; i++) {
      advance(500)
      PlaybackClock.syncSmtc(13.0)
    }
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(16, 1)
  })

  it('stays with the music through the reports Apple Music sends at a song start (measured)', () => {
    // Captured 2026-11-05: 0.06, 0.52, 0.63, 1.71, then 0.02, then 2.03 and a stall at 2.02.
    PlaybackClock.setSmtcState(0.06, true)
    const reports: Array<[number, number]> = [[272, 0.067], [456, 0.524], [103, 0.626], [1087, 1.713], [745, 0.023], [69, 2.026], [100, 2.014], [49, 2.022], [42, 2.026]]
    let truth = 0.06
    for (const [ms, pos] of reports) {
      advance(ms)
      truth += ms / 1000
      PlaybackClock.syncSmtc(pos)
      // Never more than a fraction of a second behind the music, never a line.
      expect(truth - PlaybackClock.getCurrentTime()).toBeLessThan(0.75)
    }
  })

  it('starts a new track at once, even when its first report still carries the last song (tonearm on the label)', () => {
    // The old song was near its end; the new one's first message still says 200 s.
    PlaybackClock.startTrack(200, true, 213)
    advance(500)
    // Then Apple Music reports the real place (taken at once) and stalls, as it does at a song start.
    expect(PlaybackClock.syncSmtc(0.5)).toBe('hard')
    advance(400)
    PlaybackClock.syncSmtc(2.0)
    advance(100)
    PlaybackClock.syncSmtc(2.0)
    expect(PlaybackClock.getCurrentTime()).toBeLessThan(3)
  })

  it('reads a starting position past the new track as its start', () => {
    PlaybackClock.startTrack(250, true, 213)
    expect(PlaybackClock.getCurrentTime()).toBe(0)
  })

  it('takes a far report at once just after a track change, without waiting to confirm it', () => {
    PlaybackClock.startTrack(180, true, 0)
    advance(300)
    expect(PlaybackClock.syncSmtc(0.4)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(0.4, 2)
  })

  it('follows a real seek back once the source confirms it', () => {
    play(10, (truth) => truth, 10)
    advance(200)
    expect(PlaybackClock.syncSmtc(5)).toBe('none')
    advance(1000)
    expect(PlaybackClock.syncSmtc(6)).toBe('hard')
    advance(500)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(6.5, 2)
  })

  it('closes a steady gap to a precise source', () => {
    // The music is really 0.4s ahead of where the clock started.
    play(3, (truth) => truth, 10.4)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(13.4, 2)
  })

  it('does not fall behind a source that reports whole seconds', () => {
    // Apple Music on Windows: the reported position is the true one rounded down.
    play(6, (truth) => Math.floor(truth), 10)
    const error = PlaybackClock.getCurrentTime() - 16
    expect(Math.abs(error)).toBeLessThan(0.2)
  })

  // Measured from Apple Music on Windows (2026-11-05): a timer every ~1.03 s reports the
  // position rounded down, so a single report trails the music by 0 to ~1 s.
  it('stays with a whole-second source whose reports drift against the second', () => {
    // The track's first report already trailed the music by 0.8 s (any value 0-1 s happens).
    PlaybackClock.setSmtcState(9.2, true)
    const startedAt = now
    let worst = 0
    for (let elapsed = 1030; elapsed <= 60_000; elapsed += 1030) {
      now = startedAt + elapsed
      PlaybackClock.syncSmtc(Math.floor(10 + elapsed / 1000))
      // Check between reports too, once the history covers a full cycle (~33 s).
      if (elapsed > 36_000) {
        now += 500
        worst = Math.max(worst, Math.abs(PlaybackClock.getCurrentTime() - (10 + (elapsed + 500) / 1000)))
        now -= 500
      }
    }
    expect(worst).toBeLessThan(0.15)
  })

  it('catches up with a whole-second source it started behind', () => {
    PlaybackClock.setSmtcState(10, true) // clock believes 10.0, the music is at 10.7
    play(6, (truth) => Math.floor(truth), 10.7)
    const error = PlaybackClock.getCurrentTime() - 16.7
    expect(Math.abs(error)).toBeLessThan(0.25)
  })

  it('never runs backwards when corrected backwards: it holds, then carries on', () => {
    let last = PlaybackClock.getCurrentTime()
    const startedAt = now
    for (let elapsed = 200; elapsed <= 4000; elapsed += 200) {
      now = startedAt + elapsed
      PlaybackClock.syncSmtc(9.5 + elapsed / 1000) // the music is 0.5s behind the clock
      const current = PlaybackClock.getCurrentTime()
      expect(current).toBeGreaterThanOrEqual(last)
      last = current
    }
    expect(last).toBeCloseTo(13.5, 1)
  })

  it('accounts for the time a report spent in transit', () => {
    advance(1000)
    // Sampled 300ms ago at 10.7: the source is at 11.0 now, which is what we estimate.
    expect(PlaybackClock.syncSmtc(10.7, 300)).toBe('none')
  })

  it('stops and resumes where it stands', () => {
    advance(2000)
    PlaybackClock.setSmtcPlaying(false)
    advance(5000)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(12, 3)
    PlaybackClock.setSmtcPlaying(true)
    advance(1000)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(13, 3)
  })

  it('takes a paused report as the position', () => {
    PlaybackClock.setSmtcPlaying(false)
    expect(PlaybackClock.syncSmtc(42)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBe(42)
  })
})

describe('greeting', () => {
  const at = (hour: number): Date => new Date(2026, 9, 4, hour, 0, 0)

  it('follows the hour', () => {
    expect(greetingFor(at(8), '')).toBe('Good morning.')
    expect(greetingFor(at(14), '')).toBe('Good afternoon.')
    expect(greetingFor(at(19), '')).toBe('Good evening.')
    expect(greetingFor(at(23), '')).toBe('Late night.')
    expect(greetingFor(at(3), '')).toBe('Still up?')
  })

  it('uses the name when there is one', () => {
    expect(greetingFor(at(19), ' Naman ')).toBe('Good evening, Naman.')
    expect(greetingFor(at(3), 'Naman')).toBe('Still up, Naman?')
  })

  it('forms possessives', () => {
    expect(possessive('Naman')).toBe("Naman's")
    expect(possessive('Chris')).toBe("Chris'")
    expect(possessive('  ')).toBe('')
  })
})
