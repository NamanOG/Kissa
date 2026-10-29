import { describe, expect, it } from 'vitest'
import {
  makeSurface,
  saturationCurve,
  SURFACE_SECONDS,
  ROTATION_HZ,
  WEAR_SOUND
} from '../vinylSound'

const rms = (a: Float32Array): number => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length)
const peak = (a: Float32Array): number => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

describe('the surface of the record', () => {
  it('loops on whole turns of a 33⅓ record', () => {
    expect(ROTATION_HZ).toBeCloseTo(0.5556, 3)
    expect(SURFACE_SECONDS).toBeCloseTo(7.2, 5)
    expect(makeSurface(8000, 'mint').left.length).toBe(57600)
  })

  it('is the same each time it is made, and differs between the two channels', () => {
    const a = makeSurface(8000, 'played')
    const b = makeSurface(8000, 'played')
    expect(Array.from(a.left.slice(0, 50))).toEqual(Array.from(b.left.slice(0, 50)))
    expect(a.left[100]).not.toBe(a.right[100])
  })

  it('gets noisier and busier as the record wears, and stays well below the music', () => {
    const mint = makeSurface(8000, 'mint')
    const played = makeSurface(8000, 'played')
    const loved = makeSurface(8000, 'loved')
    expect(rms(mint.left)).toBeLessThan(rms(played.left))
    expect(rms(played.left)).toBeLessThan(rms(loved.left))
    expect(mint.events).toBeLessThan(played.events)
    expect(played.events).toBeLessThan(loved.events)
    for (const s of [mint, played, loved]) expect(peak(s.left)).toBeLessThan(0.2)
    expect(WEAR_SOUND.loved.rollOff).toBeLessThan(WEAR_SOUND.mint.rollOff)
  })
})

describe('the warm saturation', () => {
  it('keeps quiet passages at their level and rounds off peaks', () => {
    const curve = saturationCurve(0.7)
    const at = (x: number): number => curve[Math.round(((x + 1) / 2) * (curve.length - 1))]
    expect(at(0)).toBeCloseTo(0, 2)
    expect(at(0.02) / 0.02).toBeCloseTo(1, 1)
    expect(Math.abs(at(1))).toBeLessThan(1.3)
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThan(curve[i - 1])
  })
})
