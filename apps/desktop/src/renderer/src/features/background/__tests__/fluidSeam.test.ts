import { describe, expect, it } from 'vitest'
import { COLOUR_FLOW, FLOW_SPEED, FRAG, flowUniforms } from '../fluidRenderer'

/*
 * The Moving light seam came from the noise working on ever-growing clock values on the GPU:
 * neighbouring noise cells disagreed and the colour field split along straight cell edges.
 * The fix keeps every number the shader sees small: the clock becomes offsets wrapped to the
 * noise's 289-cell period on the CPU. Wrapping is only invisible if the shader's noise really
 * repeats every 289 units, so the reference below mirrors the shader's noise exactly (same
 * hash, fade and octaves) and checks that property, plus the uniforms themselves.
 *
 * What this cannot prove: how a particular GPU computes the shader. That was checked on the
 * GPU with the Moving light harness (fixed clock, synthetic covers, 20-minute scans), recorded
 * in docs/release-4.4.0/overnight-qa.md.
 */

const fract = (x: number): number => x - Math.floor(x)
const mod = (x: number, m: number): number => x - m * Math.floor(x / m)
function hash(ix: number, iy: number): number {
  ix = mod(ix, 289)
  iy = mod(iy, 289)
  let px = fract(ix * 0.1031)
  let py = fract(iy * 0.103)
  const d = px * (py + 33.33) + py * (px + 33.33)
  px += d
  py += d
  return fract((px + py) * px)
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  const ab = a + (b - a) * ux
  const cd = c + (d - c) * ux
  return ab + (cd - ab) * uy
}
const fbm = (x: number, y: number): number => (noise(x, y) * 2 + noise(x * 2 + 17, y * 2 + 31)) / 3

describe('Moving light seam guard', () => {
  it('the reference matches the shader it stands for', () => {
    // If the shader's noise changes, this reference (and the period below) must be re-derived.
    expect(FRAG).toContain('i = mod(i, 289.0);')
    expect(FRAG).toContain('vec2 f = x - i;')
    expect(FRAG).toContain('f * f * f * (f * (f * 6.0 - 15.0) + 10.0)')
    expect(FRAG).toContain('(noise(x) * 2.0 + noise(x * 2.0 + vec2(17.0, 31.0))) / 3.0')
    expect(FRAG).not.toContain('uTime')
  })

  it('the noise repeats exactly every 289 units, so wrapping the clock never shows', () => {
    let worst = 0
    for (let i = 0; i < 2000; i++) {
      const x = ((i * 7.31) % 300) + (i % 13) * 0.0137
      const y = ((i * 3.77) % 300) + (i % 7) * 0.0213
      for (const [dx, dy] of [[289, 0], [0, 289], [-289, 578]]) worst = Math.max(worst, Math.abs(fbm(x + dx, y + dy) - fbm(x, y)))
    }
    expect(worst).toBeLessThan(1e-6)
  })

  it('the noise has no steps across cell edges, even far from the origin', () => {
    let worst = 0
    for (const base of [0, 37, 245 * 0.143, 288.5, 1000]) {
      for (let k = 0; k < 400; k++) {
        const x = base + k * 0.01
        worst = Math.max(worst, Math.abs(fbm(x + 0.001, 0.37) - fbm(x, 0.37)), Math.abs(fbm(0.61, x + 0.001) - fbm(0.61, x)))
      }
    }
    expect(worst).toBeLessThan(0.01)
  })

  it('keeps every value the GPU sees small, for ten hours of playback', () => {
    let lo = Infinity
    let hi = -Infinity
    for (let s = 0; s <= 36_000; s += 0.37) {
      const f = flowUniforms(s)
      for (const v of [...f.q, ...f.r, ...f.o]) {
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
    }
    expect(lo).toBeGreaterThanOrEqual(0)
    expect(hi).toBeLessThan(289)
  })

  it('from one frame to the next, each offset moves a little or wraps by exactly one period', () => {
    const dt = 1 / 30
    let worst = 0
    for (let s = 0; s <= 36_000; s += 1.9) {
      const a = flowUniforms(s)
      const b = flowUniforms(s + dt)
      for (let k = 0; k < 4; k++) {
        for (const [u, v] of [[a.q[k], b.q[k]], [a.r[k], b.r[k]]]) {
          const d = Math.abs(v - u)
          worst = Math.max(worst, Math.min(d, Math.abs(d - 289)))
        }
      }
    }
    expect(worst).toBeLessThan(0.2 * FLOW_SPEED * dt)
  })

  it('each colour field moves a little per frame or wraps by exactly one period, never jumps', () => {
    const dt = 1 / 30
    let worst = 0
    for (let s = 0; s <= 36_000; s += 1.9) {
      const a = flowUniforms(s).o
      const b = flowUniforms(s + dt).o
      a.forEach((u, k) => {
        const d = Math.abs(b[k] - u)
        worst = Math.max(worst, Math.min(d, Math.abs(d - 289)))
      })
    }
    expect(worst).toBeLessThan(COLOUR_FLOW * 2 * dt)
  })

  it('the colour fields travel in different directions, so colours interleave rather than move as one', () => {
    const a = flowUniforms(100).o
    const b = flowUniforms(110).o
    const dirs: number[] = []
    for (let k = 0; k < a.length; k += 2) dirs.push(Math.atan2(b[k + 1] - a[k + 1], b[k] - a[k]))
    const spread = Math.max(...dirs) - Math.min(...dirs)
    expect(new Set(dirs.map((d) => d.toFixed(2))).size).toBe(6)
    expect(spread).toBeGreaterThan(Math.PI)
  })
})
