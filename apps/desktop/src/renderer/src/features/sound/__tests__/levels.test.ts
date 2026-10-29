import { describe, expect, it } from 'vitest'
import { bassPulse, energyStep, follow, needlePosition, rms, toVu, VU_MAX, VU_MIN } from '../levels'

describe('sound levels', () => {
  it('measures RMS', () => {
    expect(rms([])).toBe(0)
    expect(rms([1, -1, 1, -1])).toBeCloseTo(1)
    expect(rms([0.5, -0.5])).toBeCloseTo(0.5)
  })

  it('reads 0 VU at -18 dBFS and clamps to the scale', () => {
    expect(toVu(Math.pow(10, -18 / 20))).toBeCloseTo(0)
    expect(toVu(0)).toBe(VU_MIN)
    expect(toVu(1)).toBe(VU_MAX)
  })

  it('places the needle like a VU face: rest pin, 0 VU about 70%, +3 at the end', () => {
    expect(needlePosition(VU_MIN)).toBeCloseTo(0)
    expect(needlePosition(VU_MAX)).toBeCloseTo(1)
    expect(needlePosition(0)).toBeGreaterThan(0.66)
    expect(needlePosition(0)).toBeLessThan(0.74)
    expect(needlePosition(-10)).toBeLessThan(needlePosition(-5))
  })

  it('follows smoothly and settles', () => {
    let v = 0
    for (let i = 0; i < 60; i++) v = follow(v, 1, 1 / 60)
    expect(v).toBeGreaterThan(0.99)
    expect(follow(0, 1, 0)).toBe(0)
  })

  it('energy rises faster than it falls', () => {
    const up = energyStep(0, 1, 0.1)
    const down = 1 - energyStep(1, 0, 0.1)
    expect(up).toBeGreaterThan(down)
  })

  it('a kick above the recent low end gives a pulse; steady bass does not', () => {
    expect(bassPulse(0.3, 0.3, 1 / 60).pulse).toBe(0)
    expect(bassPulse(0.3, 0.6, 1 / 60).pulse).toBeGreaterThan(0.5)
  })
})
