import { describe, expect, it } from 'vitest'
import {
  bandLevel,
  followAR,
  kickRateScale,
  ONSET_START,
  onsetStep,
  RANGE_START,
  rangeStep,
  relativeLevel,
  toDb,
  type Range
} from '../levels'

const DT = 1 / 60

/** A song-like level in dBFS: a slow verse/chorus swing plus a beat ripple, offset by `gain`. */
const song = (t: number, gain: number): number => -26 + gain + 6 * Math.sin(t * 0.7) + 3 * Math.sin(t * 2 * Math.PI * 2)

describe('the light listens: song-relative signals', () => {
  it('toDb floors silence at -90', () => {
    expect(toDb(1)).toBeCloseTo(0)
    expect(toDb(0.1)).toBeCloseTo(-20)
    expect(toDb(0)).toBe(-90)
  })

  it('rangeStep settles on a steady level and keeps 12 dB of range', () => {
    let r: Range = RANGE_START
    for (let i = 0; i < 30 * 60; i++) r = rangeStep(r, -30, DT)
    expect(Math.abs(r.ceil + 30)).toBeLessThanOrEqual(1)
    expect(r.floor).toBeLessThanOrEqual(r.ceil - 12)
  })

  it('a jump to -12 dBFS lifts the ceiling within 2 dB in a second', () => {
    let r: Range = RANGE_START
    for (let i = 0; i < 30 * 60; i++) r = rangeStep(r, -30, DT)
    for (let i = 0; i < 60; i++) r = rangeStep(r, -12, DT)
    expect(Math.abs(r.ceil + 12)).toBeLessThanOrEqual(2)
  })

  it('silence leaves the range untouched', () => {
    const r: Range = { floor: -40, ceil: -20 }
    expect(rangeStep(r, -90, DT)).toBe(r)
  })

  it('the same song 20 dB quieter gives the same response once the range has adapted', () => {
    const run = (gain: number): number[] => {
      let r: Range = RANGE_START
      const out: number[] = []
      for (let i = 0; i < 90 * 60; i++) {
        const db = song(i * DT, gain)
        r = rangeStep(r, db, DT)
        if (i >= 80 * 60) out.push(relativeLevel(r, db))
      }
      return out
    }
    const loud = run(0)
    const quiet = run(-20)
    const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length
    const spread = (a: number[]): number => Math.max(...a) - Math.min(...a)
    // Within 0.1: a very quiet song meets the ceiling's -40 dBFS limit in its troughs.
    expect(Math.abs(mean(loud) - mean(quiet))).toBeLessThan(0.1)
    expect(spread(quiet)).toBeGreaterThan(0.6) // still moving, not flattened
  })

  it('relativeLevel is 0 for silence and eased inside the range', () => {
    const r: Range = { floor: -40, ceil: -20 }
    expect(relativeLevel(r, -90)).toBe(0)
    expect(relativeLevel(r, -30)).toBeCloseTo(0.5)
    expect(relativeLevel(r, -10)).toBe(1)
  })

  it('onsetStep finds one kick per beat of a 120 BPM bass train', () => {
    let s = ONSET_START
    const strengths: number[] = []
    for (let i = 0; i < 8 * 60; i++) {
      const t = i * DT
      const bass = t % 0.5 < 0.1 ? 0.7 : 0.2
      const o = onsetStep(s, bass, DT)
      s = o.state
      if (o.strength > 0 && t > 0.9) strengths.push(o.strength)
    }
    expect(strengths.length).toBe(14) // beats from t = 1 to 8 s
    for (const k of strengths) expect(k).toBeGreaterThan(0.5)
  })

  it('a constant bass gives no kicks; two steps 100 ms apart give one', () => {
    let s = ONSET_START
    let n = 0
    for (let i = 0; i < 300; i++) {
      const o = onsetStep(s, 0.5, DT)
      s = o.state
      if (o.strength > 0 && i > 2) n++
    }
    expect(n).toBe(0)
    s = { ...ONSET_START, prev: 0.1 }
    n = 0
    const steps = [0.8, 0.8, 0.1, 0.1, 0.1, 0.1, 0.8, 0.8, 0.8, 0.8]
    for (const b of steps) {
      const o = onsetStep(s, b, DT)
      s = o.state
      if (o.strength > 0) n++
    }
    expect(n).toBe(1)
  })

  it('kicks every 0.2 s are scaled to about 0.6', () => {
    let s = ONSET_START
    for (let i = 0; i < 20 * 60; i++) {
      const t = i * DT
      s = onsetStep(s, t % 0.2 < 0.05 ? 0.8 : 0.1, DT).state
    }
    expect(kickRateScale(s.interval)).toBeCloseTo(0.6, 1)
  })

  it('the kick envelope rises past 0.6 within 70 ms and falls under 0.1 by 900 ms', () => {
    let kick = 0
    let target = 1
    let at70 = 0
    let t = 0
    while (t < 0.9 - 1e-9) {
      kick = followAR(kick, target, DT, 0.035, 0.32)
      if (kick > target * 0.9) target = 0
      t += DT
      if (Math.abs(t - 4 * DT) < 1e-6) at70 = kick
      at70 = Math.max(at70, t <= 0.07 ? kick : at70)
    }
    expect(at70).toBeGreaterThan(0.6)
    expect(kick).toBeLessThan(0.1)
  })

  it('bandLevel averages the bins in a band', () => {
    const bins = new Uint8Array(64).fill(0)
    for (let i = 2; i <= 6; i++) bins[i] = 255
    expect(bandLevel(bins, 25, 50, 150)).toBe(1)
    expect(bandLevel(bins, 25, 400, 800)).toBe(0)
  })
})
