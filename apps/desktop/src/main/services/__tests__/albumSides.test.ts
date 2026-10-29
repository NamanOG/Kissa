import { describe, expect, it } from 'vitest'
import { plainAlbumName, sidesFromTracks } from '../albumSides'

const t = (title: string, min: number, number?: string) => ({ title, length: min * 60_000, number })

describe('album sides', () => {
  it('uses a pressing’s own side letters', () => {
    const s = sidesFromTracks([t('One', 4, 'A1'), t('Two', 5, 'A2'), t('Three', 4, 'B1'), t('Four', 6, 'B2'), t('Five', 3, 'C1'), t('Six', 3, 'D1')])
    expect(s?.kind).toBe('vinyl')
    expect(s?.sides.map((x) => x.letter)).toEqual(['A', 'B', 'C', 'D'])
    expect(s?.sides[1].tracks.map((x) => x.title)).toEqual(['Three', 'Four'])
  })

  it('splits a CD into two sides by running time', () => {
    const s = sidesFromTracks([t('a', 4, '1'), t('b', 4, '2'), t('c', 4, '3'), t('d', 4, '4'), t('e', 4, '5'), t('f', 4, '6')])
    expect(s?.kind).toBe('split')
    expect(s?.sides.map((x) => x.tracks.length)).toEqual([3, 3])
  })

  it('splits a long album into four sides, each with at least one track', () => {
    const tracks = Array.from({ length: 14 }, (_, i) => t(`t${i}`, 5))
    const s = sidesFromTracks(tracks)!
    expect(s.sides.map((x) => x.letter)).toEqual(['A', 'B', 'C', 'D'])
    expect(s.sides.every((x) => x.tracks.length > 0)).toBe(true)
    expect(s.sides.reduce((n, x) => n + x.tracks.length, 0)).toBe(14)
  })

  it('handles two tracks, unknown lengths, and a lone track as a single', () => {
    expect(sidesFromTracks([t('a', 0), t('b', 0)])?.sides.map((x) => x.tracks.length)).toEqual([1, 1])
    expect(sidesFromTracks([t('a', 3)])?.kind).toBe('single')
  })

  it('reduces streaming album names', () => {
    expect(plainAlbumName('Beauty Behind the Madness (Deluxe)')).toBe('Beauty Behind the Madness')
    expect(plainAlbumName('After Hours - Single')).toBe('After Hours')
    expect(plainAlbumName('Rumours (Remastered 2004)')).toBe('Rumours')
  })

  it('puts a single on side A', () => {
    expect(sidesFromTracks([{ title: 'Save Your Tears (remix)', length: 191000, number: '1' }])).toEqual({
      kind: 'single',
      sides: [{ letter: 'A', tracks: [{ title: 'Save Your Tears (remix)', length: 191000 }] }]
    })
    expect(sidesFromTracks([])).toBeNull()
  })
})
