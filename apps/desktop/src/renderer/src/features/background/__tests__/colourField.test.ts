import { describe, expect, it } from 'vitest'
import { extractPalette, fieldColours, MAX_L, MIN_L, MIN_SHARE, paletteTexture, rgbToOklab, SLOTS } from '../colourField'

/** A 48 x 48 RGBA image painted by a function of (x, y) in 0..1. */
function image(paint: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const n = 48
  const px = new Uint8ClampedArray(n * n * 4)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const [r, g, b] = paint((x + 0.5) / n, (y + 0.5) / n)
      px.set([r, g, b, 255], (y * n + x) * 4)
    }
  return px
}

const near = (a: number[], b: number[], tol = 18): boolean => a.every((v, i) => Math.abs(v - b[i]) <= tol)
const chroma = (rgb: [number, number, number]): number => {
  const [, a, b] = rgbToOklab(...rgb)
  return Math.hypot(a, b)
}

describe('Moving light palette', () => {
  // The case the old renderer missed: important colours only along the edges.
  const edges = image((x, y) => {
    if (y < 0.17) return [40, 110, 200] // blue band along the top
    if (x < 0.09) return [40, 150, 70] // green strip down the left
    if (x + y > 1.7) return [200, 40, 150] // magenta corner
    return [176, 160, 140] // neutral middle
  })

  it('finds colours that sit only at the top, the edges and a corner', () => {
    const pal = extractPalette(edges, 48, 48)
    for (const c of [[40, 110, 200], [40, 150, 70], [200, 40, 150], [176, 160, 140]])
      expect(pal.some((s) => near(s.rgb, c))).toBe(true)
    const blue = pal.find((s) => near(s.rgb, [40, 110, 200]))!
    expect(blue.y).toBeLessThan(0.2) // and knows where it was
  })

  it('gives a small secondary colour a floor of presence, but keeps the main colour largest', () => {
    const pal = extractPalette(edges, 48, 48)
    const tex = paletteTexture(pal)
    const alphas = pal.map((_, i) => tex[i * 4 + 3])
    const main = pal.findIndex((s) => near(s.rgb, [176, 160, 140]))
    expect(Math.max(...alphas)).toBe(alphas[main])
    for (const a of alphas) expect(a / 255).toBeGreaterThanOrEqual(MIN_SHARE / Math.max(...pal.map((s) => Math.max(MIN_SHARE, s.share))) - 0.01)
    // Unused slots are empty
    for (let i = pal.length; i < SLOTS; i++) expect(tex[i * 4 + 3]).toBe(0)
  })

  it('a black-and-white cover gives only greys: light and dark variation, no invented hue', () => {
    const mono = image((x, y) => {
      const v = Math.round(255 * (0.5 + 0.5 * Math.sin(x * 9) * Math.cos(y * 7)))
      return [v, v, v]
    })
    const pal = extractPalette(mono, 48, 48)
    expect(pal.length).toBeGreaterThan(2)
    for (const c of fieldColours(pal)) expect(chroma(c)).toBeLessThan(0.01)
    const ls = fieldColours(pal).map((c) => rgbToOklab(...c)[0])
    expect(Math.max(...ls) - Math.min(...ls)).toBeGreaterThan(0.15) // light and dark stay apart
  })

  it('keeps every colour within the room lightness range, so text stays readable', () => {
    const bright = image((x) => (x < 0.5 ? [255, 250, 235] : [250, 200, 120]))
    for (const c of fieldColours(extractPalette(bright, 48, 48))) {
      const L = rgbToOklab(...c)[0]
      expect(L).toBeLessThanOrEqual(MAX_L + 0.01)
      expect(L).toBeGreaterThanOrEqual(MIN_L - 0.01)
    }
  })

  it('is deterministic for the same cover', () => {
    expect(extractPalette(edges, 48, 48)).toEqual(extractPalette(edges, 48, 48))
  })
})
