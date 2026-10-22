import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../deckSounds', () => ({ playDeckSound: vi.fn() }))
import { playDeckSound } from '../deckSounds'
import {
  ARM_TRAVEL_MS,
  QUIET_START_MS,
  needleContact,
  needleFollowPlayback,
  needleLift,
  needleStateForTest,
  registerTonearm,
  resetNeedleForTest
} from '../needleSounds'

const played = (): string[] => vi.mocked(playDeckSound).mock.calls.map((c) => c[0])

beforeEach(() => {
  vi.mocked(playDeckSound).mockClear()
  vi.useFakeTimers()
  resetNeedleForTest()
})
afterEach(() => vi.useRealTimers())

describe('when the needle is heard', () => {
  it('contact once, lift once: repeated reports of the same moment stay silent', () => {
    needleContact()
    needleContact()
    needleLift()
    needleLift()
    expect(played()).toEqual(['needleDrop', 'needleLift'])
  })

  it('no lift sound if the stylus never touched the record (paused before the arm landed)', () => {
    needleLift()
    expect(played()).toEqual([])
  })

  it('picking the arm up and dropping it on another groove mid-song: lift, then contact', () => {
    needleContact()
    needleLift() // drag begins
    needleContact() // arm lowered on the new groove
    expect(played()).toEqual(['needleDrop', 'needleLift', 'needleDrop'])
  })

  it('with no arm on screen, contact follows the arm\'s usual travel and a quick pause cancels it', () => {
    needleFollowPlayback(true)
    expect(played()).toEqual([])
    vi.advanceTimersByTime(ARM_TRAVEL_MS - 1)
    expect(played()).toEqual([])
    needleFollowPlayback(false) // rejected command or a quick pause: nothing landed
    vi.advanceTimersByTime(2000)
    expect(played()).toEqual([])
    expect(needleStateForTest().pending).toBe(false)
  })

  it('with no arm on screen: play then pause later gives contact then lift, no duplicates', () => {
    needleFollowPlayback(true)
    needleFollowPlayback(true) // a repeated external update
    vi.advanceTimersByTime(ARM_TRAVEL_MS)
    needleFollowPlayback(false)
    expect(played()).toEqual(['needleDrop', 'needleLift'])
  })

  it('a visible tonearm takes over: playback changes alone make no sound while it is mounted', () => {
    const unregister = registerTonearm()
    needleFollowPlayback(true)
    vi.advanceTimersByTime(5000)
    expect(played()).toEqual([])
    needleContact() // the arm landed
    unregister()
    needleFollowPlayback(false) // paused from another view later
    expect(played()).toEqual(['needleDrop', 'needleLift'])
  })

  it('an arm appearing cancels a contact still waiting from another view', () => {
    needleFollowPlayback(true)
    const unregister = registerTonearm()
    vi.advanceTimersByTime(5000)
    expect(played()).toEqual([])
    unregister()
  })

  it('catching up with music already playing at start-up is silent, but the needle is still in the groove', () => {
    let now = 0
    resetNeedleForTest({ startedAt: 0, now: () => now })
    needleContact()
    expect(played()).toEqual([])
    now = QUIET_START_MS + 1
    needleLift()
    expect(played()).toEqual(['needleLift'])
  })
})
