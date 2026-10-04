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

  it('jumps to a report that is far away (a seek)', () => {
    advance(1000)
    expect(PlaybackClock.syncSmtc(95)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(95, 3)
  })

  it('jumps back to the start when the track restarts', () => {
    advance(8000)
    expect(PlaybackClock.syncSmtc(0.2)).toBe('hard')
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(0.2, 3)
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
