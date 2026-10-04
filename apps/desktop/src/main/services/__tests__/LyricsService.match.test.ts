import { describe, expect, it } from 'vitest'
import { pickBestLyricsResult, type LRCLIBItem } from '../LyricsService'

const TIMED = '[00:01.00] first line\n[00:05.00] second line'

const item = (over: Partial<LRCLIBItem>): LRCLIBItem => ({
  trackName: 'Paper Lanterns',
  artistName: 'The Quiet Hours',
  duration: 214,
  syncedLyrics: TIMED,
  plainLyrics: 'first line\nsecond line',
  instrumental: false,
  ...over
})

const target = { title: 'Paper Lanterns', artist: 'The Quiet Hours', duration: 214 }

describe('pickBestLyricsResult', () => {
  it('uses timed lyrics from the same recording', () => {
    const result = pickBestLyricsResult([item({ duration: 245 }), item({ duration: 215 })], target)
    expect(result?.syncedLyrics).toBe(TIMED)
    expect(result?.duration).toBe(215)
  })

  it('does not use timed lyrics from a different cut: offers the words untimed instead', () => {
    const result = pickBestLyricsResult([item({ duration: 251 })], target)
    expect(result?.syncedLyrics).toBeNull()
    expect(result?.plainLyrics).toBe('first line\nsecond line')
  })

  it('strips timestamps when a different cut has only timed lyrics', () => {
    const result = pickBestLyricsResult([item({ duration: 251, plainLyrics: null })], target)
    expect(result?.syncedLyrics).toBeNull()
    expect(result?.plainLyrics).toBe('first line\nsecond line')
  })

  it('ignores results for another song or another artist', () => {
    expect(pickBestLyricsResult([item({ trackName: 'Paper Planes' })], target)).toBeNull()
    expect(pickBestLyricsResult([item({ artistName: 'Someone Else' })], target)).toBeNull()
  })

  it('matches through version suffixes, featured artists and accents', () => {
    const result = pickBestLyricsResult(
      [item({ trackName: 'Paper Lanterns', artistName: 'The Quiet Hours' })],
      { title: 'Paper Lanterns (2011 Remaster)', artist: 'The Quiet Hours feat. Odile', duration: 214 }
    )
    expect(result?.syncedLyrics).toBe(TIMED)

    const accented = pickBestLyricsResult(
      [item({ trackName: 'Dónde Está', artistName: 'Beyoncé' })],
      { title: 'Donde Esta', artist: 'Beyonce', duration: 214 }
    )
    expect(accented?.syncedLyrics).toBe(TIMED)
  })

  it('accepts timed lyrics when the track length is not known', () => {
    const result = pickBestLyricsResult([item({ duration: 300 })], { ...target, duration: 0 })
    expect(result?.syncedLyrics).toBe(TIMED)
  })

  it('reports an instrumental', () => {
    const result = pickBestLyricsResult(
      [item({ syncedLyrics: null, plainLyrics: null, instrumental: true })],
      target
    )
    expect(result?.instrumental).toBe(true)
  })
})
