import { describe, expect, it } from 'vitest'
import { join } from 'path'
import {
  classifyProblem,
  firstNumber,
  isInside,
  isPlayableName,
  isUnplayableMusicName,
  orderTracks,
  parseRange,
  parseTrackUrl,
  secondsFrom100ns,
  titleFromFileName,
  trackUrl
} from '../albumFolder'

const row = (fileName: string, track = 0, disc = 0) => ({ fileName, track, disc })

describe('album folder helpers', () => {
  it('plays only the formats checked in the experiment', () => {
    for (const n of ['a.mp3', 'b.FLAC', 'c.m4a', 'd.ogg', 'e.opus', 'f.wav'])
      expect(isPlayableName(n)).toBe(true)
    for (const n of ['a.wma', 'b.aiff', 'cover.jpg', 'notes.txt'])
      expect(isPlayableName(n)).toBe(false)
    expect(isUnplayableMusicName('a.wma')).toBe(true)
    expect(isUnplayableMusicName('cover.jpg')).toBe(false)
  })

  it('orders by disc then track when every file is numbered', () => {
    const { order, tracks } = orderTracks([
      row('x.flac', 2, 2),
      row('y.flac', 1, 2),
      row('z.flac', 9, 1)
    ])
    expect(order).toBe('tags')
    expect(tracks.map((t) => t.fileName)).toEqual(['z.flac', 'y.flac', 'x.flac'])
  })

  it('falls back to natural file-name order when a track number is missing', () => {
    const { order, tracks } = orderTracks([
      row('10 Ten.mp3', 10),
      row('2 Two.mp3'),
      row('1 One.mp3', 1)
    ])
    expect(order).toBe('filenames')
    expect(tracks.map((t) => t.fileName)).toEqual(['1 One.mp3', '2 Two.mp3', '10 Ten.mp3'])
  })

  it('reads numbers, durations and titles the way Windows reports them', () => {
    expect(firstNumber('2/3')).toBe(2)
    expect(firstNumber('')).toBe(0)
    expect(secondsFrom100ns('1834000000')).toBe(183)
    expect(secondsFrom100ns('')).toBe(0)
    expect(titleFromFileName('03 - Blue in Green.flac')).toBe('Blue in Green')
    expect(titleFromFileName('01 Zulu.mp3')).toBe('Zulu')
    expect(titleFromFileName('So What.mp3')).toBe('So What')
  })

  it('round-trips addresses and refuses anything that is not a track address', () => {
    expect(parseTrackUrl(trackUrl(3, 7))).toEqual({ generation: 3, index: 7 })
    expect(parseTrackUrl('kissa-album://track/3/../../etc')).toBeNull()
    expect(parseTrackUrl('kissa-album://other/3/1')).toBeNull()
    expect(parseTrackUrl('file:///C:/Windows/win.ini')).toBeNull()
    expect(parseTrackUrl('not a url')).toBeNull()
  })

  it('keeps files strictly inside the album folder', () => {
    const folder = join('/music', 'Kind of Blue')
    expect(isInside(folder, join(folder, '01 So What.flac'))).toBe(true)
    expect(isInside(folder, join(folder, '..', 'Other', 'a.flac'))).toBe(false)
    expect(isInside(folder, folder)).toBe(false)
  })

  it('serves byte ranges for seeking', () => {
    expect(parseRange(null, 100)).toBeNull()
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 })
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable')
  })

  it('says why a file will not play', () => {
    expect(classifyProblem('a.mp3', { exists: false, size: 0 })).toBe('missing')
    expect(classifyProblem('a.wma', { exists: true, size: 10 })).toBe('unsupported')
    expect(
      classifyProblem('a.m4a', {
        exists: true,
        size: 10,
        sample: Buffer.from('....stsd....alac....')
      })
    ).toBe('unsupported')
    expect(
      classifyProblem('a.m4a', { exists: true, size: 10, sample: Buffer.from('....mp4a....') })
    ).toBe('damaged')
    expect(classifyProblem('a.flac', { exists: true, size: 0 })).toBe('damaged')
  })
})
