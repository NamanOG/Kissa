import { beforeEach, describe, expect, it } from 'vitest'
import { loadLyricsOffset, lyricsSourceKey, saveLyricsOffset } from '../lyricsOffsets'
import { usePlayerStore } from '@renderer/stores/playerStore'

const APPLE = 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App'
const SPOTIFY = 'Spotify.exe'

describe('lyrics timing per player', () => {
  beforeEach(() => localStorage.clear())

  it('groups players into families', () => {
    expect(lyricsSourceKey(APPLE)).toBe('apple-music')
    expect(lyricsSourceKey('AppleInc.AppleMusicWin_other!App')).toBe('apple-music')
    expect(lyricsSourceKey(SPOTIFY)).toBe('spotify')
    expect(lyricsSourceKey(undefined)).toBe('kissa')
    expect(lyricsSourceKey('kissa-idle')).toBe('kissa')
  })

  it('keeps a separate value for each player, clamped to ±2 s', () => {
    saveLyricsOffset(APPLE, 0.3)
    saveLyricsOffset(SPOTIFY, -5)
    expect(loadLyricsOffset(APPLE)).toBe(0.3)
    expect(loadLyricsOffset(SPOTIFY)).toBe(-2)
    expect(loadLyricsOffset('Chrome')).toBe(0)
  })

  it('carries the older single value over as everyone\'s starting point', () => {
    localStorage.setItem('kissa_lyrics_offset', '0.4')
    expect(loadLyricsOffset(SPOTIFY)).toBe(0.4)
    saveLyricsOffset(SPOTIFY, 0.1)
    expect(loadLyricsOffset(SPOTIFY)).toBe(0.1)
    expect(loadLyricsOffset(APPLE)).toBe(0.4)
  })

  it('survives broken storage', () => {
    localStorage.setItem('kissa_lyrics_offsets', '{nope')
    expect(loadLyricsOffset(APPLE)).toBe(0)
  })

  it('swaps the nudge in the player store when the player changes', () => {
    const track = usePlayerStore.getState().currentTrack
    usePlayerStore.setState({ currentTrack: { ...track!, sourceAppId: APPLE } })
    usePlayerStore.getState().setLyricsOffset(0.5)
    usePlayerStore.setState({ currentTrack: { ...track!, sourceAppId: SPOTIFY } })
    expect(usePlayerStore.getState().lyricsOffset).toBe(0)
    usePlayerStore.getState().setLyricsOffset(-0.2)
    usePlayerStore.setState({ currentTrack: { ...track!, sourceAppId: APPLE } })
    expect(usePlayerStore.getState().lyricsOffset).toBe(0.5)
  })
})
