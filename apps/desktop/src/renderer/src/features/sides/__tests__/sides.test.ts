import { describe, expect, it } from 'vitest'
import { isSingle, locate, normTitle, sideRatio, singleSides, type Sides } from '../sides'

const sides: Sides = {
  kind: 'split',
  sides: [
    { letter: 'A', tracks: [{ title: 'Real Life', length: 120_000 }, { title: 'Losers (feat. Labrinth)', length: 240_000 }] },
    { letter: 'B', tracks: [{ title: 'The Hills', length: 240_000 }, { title: "Can't Feel My Face", length: 210_000 }] }
  ]
}

describe('sides', () => {
  it('normalises titles', () => {
    expect(normTitle('Losers (feat. Labrinth)')).toBe(normTitle('Losers'))
    expect(normTitle("Can't Feel My Face - Remastered")).toBe(normTitle('Cant Feel My Face'))
  })

  it('finds the track on its side', () => {
    expect(locate(sides, 'The Hills')).toEqual({ side: 1, track: 0 })
    expect(locate(sides, 'Losers')).toEqual({ side: 0, track: 1 })
    expect(locate(sides, 'Not on it')).toBeNull()
    expect(locate(null, 'The Hills')).toBeNull()
  })

  it('places the needle across the whole side', () => {
    expect(sideRatio(sides, { side: 0, track: 0 }, 0, 120)).toBe(0)
    expect(sideRatio(sides, { side: 0, track: 1 }, 0, 240)).toBeCloseTo(1 / 3)
    expect(sideRatio(sides, { side: 0, track: 1 }, 240, 240)).toBe(1)
  })

  it('gives a single its side A, and never makes up sides for an album', () => {
    expect(isSingle('Save Your Tears (Remix) - Single', 'Save Your Tears (Remix)')).toBe(true)
    expect(isSingle('Blinding Lights', 'Blinding Lights')).toBe(true)
    expect(isSingle('After Hours', 'Blinding Lights')).toBe(false)
    const one = singleSides('Save Your Tears (Remix) - Single', 'Save Your Tears (Remix)', 191)
    expect(one?.sides).toEqual([{ letter: 'A', tracks: [{ title: 'Save Your Tears (Remix)', length: 191000 }] }])
    expect(locate(one, 'Save Your Tears (Remix)')).toEqual({ side: 0, track: 0 })
    expect(singleSides('After Hours', 'Blinding Lights', 200)).toBeNull()
  })
})
