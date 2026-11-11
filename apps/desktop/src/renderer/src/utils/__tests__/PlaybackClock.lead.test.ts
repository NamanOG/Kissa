import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaybackClock, sourceProfile, APPLE_MUSIC_LEAD_SECONDS } from '../PlaybackClock'

/**
 * Apple Music on Windows reports whole seconds from a timer firing every ~1.028 s, and its
 * timeline trails what is heard (measured 2026-11-06, docs/experiments/polish-2026-11-06/
 * lyrics-lag-round16.md). Lyrics must follow what is heard, not what is reported.
 */
describe('PlaybackClock source lead', () => {
  let now = 0
  const APPLE = 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App'

  beforeEach(() => {
    now = 1_000_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    PlaybackClock.setAudioElement(null)
    PlaybackClock.setMode(true)
    PlaybackClock.setSourceProfile({ leadSeconds: 0 })
  })

  afterEach(() => {
    PlaybackClock.setSourceProfile({ leadSeconds: 0 })
    vi.restoreAllMocks()
  })

  /**
   * Feeds Apple-style reports for `seconds`: every 1.028 s the source reports the whole second
   * it had reached LATENCY ago, so the reports trail the audio by LATENCY plus a part of a second.
   */
  const LATENCY = APPLE_MUSIC_LEAD_SECONDS
  const playApple = (heardAtStart: number, seconds: number): number => {
    const startedAt = now
    let heard = heardAtStart
    for (let t = 0; t <= seconds * 1000; t += 1028) {
      now = startedAt + t
      heard = heardAtStart + t / 1000
      PlaybackClock.syncSmtc(Math.floor(heard - LATENCY + 1e-9), 0)
    }
    return heard
  }

  it('only Apple Music gets a lead', () => {
    expect(sourceProfile(APPLE).leadSeconds).toBeCloseTo(0.45)
    expect(sourceProfile('Spotify.exe').leadSeconds).toBe(0)
    expect(sourceProfile(undefined).leadSeconds).toBe(0)
  })

  it('without the lead, a line is late by the source latency (the reported bug)', () => {
    PlaybackClock.startTrack(30, true, 240)
    const heard = playApple(30.95, 50)
    // The clock rides the reports faithfully, so it trails what is heard.
    expect(heard - PlaybackClock.getCurrentTime()).toBeGreaterThan(0.3)
  })

  it('with the lead, the clock follows what is heard', () => {
    PlaybackClock.setSourceProfile(sourceProfile(APPLE))
    PlaybackClock.startTrack(30, true, 240)
    const heard = playApple(30.95, 50)
    expect(Math.abs(PlaybackClock.getCurrentTime() - heard)).toBeLessThan(0.15)
  })

  it('a seek lands on the target, not a lead past it', () => {
    PlaybackClock.setSourceProfile(sourceProfile(APPLE))
    PlaybackClock.setSmtcState(10, true)
    PlaybackClock.setSeekPosition(90)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(90, 3)
    now += 1000
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(91, 3)
  })

  it('pausing keeps the place that was heard', () => {
    PlaybackClock.setSourceProfile(sourceProfile(APPLE))
    PlaybackClock.setSmtcState(10, true)
    now += 2000
    const before = PlaybackClock.getCurrentTime()
    PlaybackClock.setSmtcPlaying(false)
    expect(PlaybackClock.getCurrentTime()).toBeCloseTo(before, 3)
  })
})
