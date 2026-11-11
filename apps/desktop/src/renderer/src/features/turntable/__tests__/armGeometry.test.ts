import { describe, expect, it } from 'vitest'
import {
  ARM_TIP_SVG,
  angleForShare,
  geometryFromBoxes,
  grooveAngles,
  LEAD_IN_SHARE,
  RUN_OUT_SHARE,
  tangentError,
  tipAt,
  tipShare
} from '../armGeometry'

// The deck as laid out flat on the 5.1 build at 1536x863 (measured live, 2026-11-11).
const ARM = { left: 1239.93, top: 101.35, width: 218.4, height: 540.95 }
const RECORD = { left: 767.73, top: 125.59, width: 474, height: 474 }

describe('tonearm geometry', () => {
  const g = geometryFromBoxes(ARM, RECORD)!

  it('puts the stylus tip where the drawing has it', () => {
    expect(ARM_TIP_SVG[0]).toBeCloseTo(20.15, 1)
    expect(ARM_TIP_SVG[1]).toBeCloseTo(391.7, 1)
    expect(g.pivot[0]).toBeCloseTo(1397.2, 1)
  })

  it('solves the lead-in just inside the record edge and the run-out just outside the label', () => {
    const { outer, inner } = grooveAngles(g)
    expect(tipShare(g, outer)).toBeCloseTo(LEAD_IN_SHARE, 3)
    expect(tipShare(g, inner)).toBeCloseTo(RUN_OUT_SHARE, 3)
    expect(outer).toBeGreaterThan(17)
    expect(outer).toBeLessThan(20)
    expect(inner).toBeGreaterThan(36)
    expect(inner).toBeLessThan(39)
    // The tip is always on the record between the two.
    for (let a = outer; a <= inner; a += 0.5) {
      const s = tipShare(g, a)
      expect(s).toBeLessThanOrEqual(0.952)
      expect(s).toBeGreaterThanOrEqual(0.28)
    }
  })

  it('keeps the cartridge close to the groove across the side', () => {
    const { outer, inner } = grooveAngles(g)
    for (let f = 0; f <= 0.8; f += 0.1) expect(Math.abs(tangentError(g, outer + f * (inner - outer)))).toBeLessThan(3)
    expect(Math.abs(tangentError(g, inner))).toBeLessThan(6)
  })

  it('works the same at other deck sizes (Party, fullscreen, a small window)', () => {
    for (const k of [0.6, 1.4, 2.2]) {
      const scale = (b: typeof ARM) => ({ left: b.left * k, top: b.top * k, width: b.width * k, height: b.height * k })
      const gk = geometryFromBoxes(scale(ARM), scale(RECORD))!
      const { outer, inner } = grooveAngles(gk)
      expect(tipShare(gk, outer)).toBeCloseTo(LEAD_IN_SHARE, 3)
      expect(tipShare(gk, inner)).toBeCloseTo(RUN_OUT_SHARE, 3)
      expect(outer).toBeCloseTo(grooveAngles(g).outer, 3)
    }
  })

  it('the tip moves inward as the arm swings in', () => {
    let last = tipShare(g, 0)
    for (let a = 1; a <= 40; a++) {
      const s = tipShare(g, a)
      expect(s).toBeLessThan(last)
      last = s
    }
    expect(angleForShare(g, 0.5)).toBeGreaterThan(angleForShare(g, 0.9))
    expect(tipAt(g, 0)[0]).toBeGreaterThan(tipAt(g, 30)[0])
  })

  it('cannot measure an empty layout', () => {
    expect(geometryFromBoxes({ left: 0, top: 0, width: 0, height: 0 }, RECORD)).toBeNull()
  })
})
