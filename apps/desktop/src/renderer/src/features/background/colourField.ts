/**
 * Moving light's colours: the cover's main colours and how much of the cover each covers, for
 * the shader to flow (fluidRenderer.ts gives each colour its own moving field).
 *
 * Why not the cover itself: the cover blurred to 64 px and sampled through its middle (the
 * 4.4.0 renderer) never reached the top, bottom or corners, so a blue sky or a coloured border
 * vanished and most albums became one wash of their central colour. Here every main colour from
 * anywhere on the cover counts, each with a floor on its presence so a secondary colour still
 * has regions. Colours are only ever taken from the cover: a black-and-white cover yields greys
 * of different lightness, never an invented hue.
 *
 * Pure functions on plain pixel arrays, so they can be tested without a browser.
 */

export interface Swatch {
  /** sRGB, 0 to 255 */
  rgb: [number, number, number]
  /** Share of the cover, 0 to 1 */
  share: number
  /** Where on the cover the colour sits on average, 0 to 1 */
  x: number
  y: number
}

// Oklab (Björn Ottosson), for distances and lightness that match perception.
const toLinear = (c: number): number => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const toSrgb = (v: number): number => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, c)) * 255)
}
export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  ]
}

const HUE_WEIGHT = 2.5

/**
 * The cover's main colours (up to `keep`, from `k` groups), from RGBA pixels of a small copy of the cover.
 * k-means in Oklab, seeded deterministically from the most distinct colours, so the same
 * cover always gives the same field.
 */
export function extractPalette(px: Uint8ClampedArray | Uint8Array, width: number, height: number, k = 12, keep = 6): Swatch[] {
  const n = width * height
  const lab: Array<[number, number, number]> = [] // grouping space (hue weighted)
  const orig: Array<[number, number, number]> = [] // the pixel's own Oklab colour
  const pos: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3] < 128) continue
    const [L, a, b] = rgbToOklab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])
    // Hue and chroma count more than lightness when grouping, so a muted red among greys of
    // similar lightness still becomes its own colour. Near black, a faint tint is just black:
    // there hue counts for less, so a dark green-black background does not pose as "green".
    const hw = HUE_WEIGHT * Math.min(1, L / 0.45)
    lab.push([L, a * hw, b * hw])
    orig.push([L, a, b])
    pos.push([((i % width) + 0.5) / width, (Math.floor(i / width) + 0.5) / height])
  }
  if (!lab.length) return []
  const d2 = (p: number[], q: number[]): number => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
  // Seeds: the mean colour, then repeatedly the pixel farthest from every seed so far.
  const mean = [0, 0, 0]
  for (const p of lab) for (let j = 0; j < 3; j++) mean[j] += p[j] / lab.length
  const centres: number[][] = []
  let far = 0
  for (let i = 1; i < lab.length; i++) if (d2(lab[i], mean) > d2(lab[far], mean)) far = i
  centres.push([...lab[far]])
  const best = lab.map((p) => d2(p, centres[0]))
  while (centres.length < k) {
    let pick = 0
    for (let i = 1; i < lab.length; i++) if (best[i] > best[pick]) pick = i
    if (best[pick] < 1e-5) break
    centres.push([...lab[pick]])
    for (let i = 0; i < lab.length; i++) best[i] = Math.min(best[i], d2(lab[i], centres[centres.length - 1]))
  }
  const assign = new Int32Array(lab.length)
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < lab.length; i++) {
      let c = 0
      for (let j = 1; j < centres.length; j++) if (d2(lab[i], centres[j]) < d2(lab[i], centres[c])) c = j
      assign[i] = c
    }
    const sum = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < lab.length; i++) {
      const s = sum[assign[i]]
      s[0] += lab[i][0]
      s[1] += lab[i][1]
      s[2] += lab[i][2]
      s[3]++
    }
    sum.forEach((s, j) => {
      if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    })
  }
  const groups = centres.map((c) => ({ lab: c, col: [0, 0, 0], count: 0, x: 0, y: 0 }))
  for (let i = 0; i < lab.length; i++) {
    const g = groups[assign[i]]
    g.col[0] += orig[i][0]
    g.col[1] += orig[i][1]
    g.col[2] += orig[i][2]
    g.count++
    g.x += pos[i][0]
    g.y += pos[i][1]
  }
  // Merge colours too close to tell apart; drop specks. A vivid accent (red petals, a yellow
  // title) counts from 1.5 % of the cover, a dull one from 3 %.
  const chroma = (g: { col: number[]; count: number }): number => Math.hypot(g.col[1], g.col[2]) / g.count
  let kept: typeof groups = []
  for (const g of groups.filter((g) => g.count > 0).sort((a, b) => b.count - a.count)) {
    const twin = kept.find((h) => Math.sqrt(d2(h.lab, g.lab)) < 0.07)
    if (twin) {
      const t = twin.count + g.count
      twin.lab = twin.lab.map((v, j) => (v * twin.count + g.lab[j] * g.count) / t)
      twin.col = twin.col.map((v, j) => v + g.col[j])
      twin.x += g.x
      twin.y += g.y
      twin.count = t
    } else if (g.count / lab.length >= (chroma(g) > 0.05 ? 0.015 : 0.03)) kept.push(g)
  }
  // Keep the colours that matter most: vivid accents even when small (After Hours' red), and
  // large colours; muted tints rank lowest. The cover's lightest and darkest tones (when they
  // cover a fair part of it) are always kept, so its light and dark both flow through.
  const L = (g: { col: number[]; count: number }): number => g.col[0] / g.count
  const ranked = kept
    .map((g) => ({ g, score: Math.sqrt(g.count / lab.length) * (1 + 30 * Math.max(0, chroma(g) - 0.04)) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.g)
  const fair = ranked.filter((g) => g.count / lab.length >= 0.06)
  const anchors = fair.length ? [fair.reduce((m, g) => (L(g) > L(m) ? g : m)), fair.reduce((m, g) => (L(g) < L(m) ? g : m))] : []
  const chosen = [...new Set(anchors)].filter((g) => Math.abs(L(g) - L(anchors[0] ?? g)) > 0.25 || g === anchors[0])
  for (const g of ranked) if (chosen.length < keep && !chosen.includes(g)) chosen.push(g)
  kept = chosen
  const total = kept.reduce((s, g) => s + g.count, 0)
  return kept.map((g) => ({
    rgb: oklabToRgb(g.col[0] / g.count, g.col[1] / g.count, g.col[2] / g.count),
    share: g.count / total,
    x: g.x / g.count,
    y: g.y / g.count
  }))
}

/**
 * The field's lightness range (Oklab L). The cover's lightness is compressed into it rather than
 * clipped, so light covers stay behind readable text and a black-and-white cover keeps its
 * light and dark regions apart.
 */
export const MIN_L = 0.16
export const MAX_L = 0.62
/** No colour gets less presence than this, however small it is on the cover. */
export const MIN_SHARE = 0.12

/** The palette as the field will show it: lightness kept within the room's range, hue and chroma kept. */
export function fieldColours(palette: Swatch[]): Array<[number, number, number]> {
  // In a colourful cover, near-white and near-grey regions take a little of the cover's own
  // average hue, so a white-hot fireball reads warm rather than as a grey patch. In a
  // black-and-white cover the average hue is itself neutral, so nothing changes.
  const labs = palette.map((s) => rgbToOklab(...s.rgb))
  let ma = 0
  let mb = 0
  labs.forEach(([, a, b], i) => {
    ma += a * palette[i].share
    mb += b * palette[i].share
  })
  const colourful = Math.hypot(ma, mb) > 0.025
  return palette.map((s, i) => {
    let [L, a, b] = labs[i]
    if (colourful && Math.hypot(a, b) < 0.03) {
      a += ma * 0.6
      b += mb * 0.6
    }
    const L2 = MIN_L + Math.max(0, Math.min(1, L)) * (MAX_L - MIN_L)
    // Keep relative chroma when lightness is lowered, so a darkened colour stays the same colour.
    let k = L > 0 ? Math.min(1.3, Math.max(0.75, L2 / L + 0.2)) : 1
    // Pale tints (a light sky, a pale blue wash) lose their colour when darkened; give them more of
    // their own hue so a bright cover does not turn into slate. True greys have no hue to boost.
    const c = Math.hypot(a, b)
    if (L > 0.7 && c > 0.008 && c < 0.08) k *= 1.9
    return oklabToRgb(L2, a * k, b * k)
  })
}

/** Slots in the palette texture (a power of two; the shader reads the first six). */
export const SLOTS = 8

/**
 * The palette as the shader reads it: a SLOTS x 1 RGBA strip, one texel per colour. rgb is the
 * colour as the room shows it (fieldColours); alpha is its presence, its share of the cover with
 * a floor of MIN_SHARE so a secondary colour still claims regions. Unused slots have alpha 0.
 */
export function paletteTexture(palette: Swatch[]): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(SLOTS * 4))
  // Presence grows with share but flattened (square root), so a dominant colour cannot crowd
  // the others out and every colour keeps flowing through.
  const shares = palette.map((s) => Math.sqrt(Math.max(MIN_SHARE, s.share)))
  const top = Math.max(...shares, 1e-6)
  fieldColours(palette).forEach((rgb, i) => {
    if (i >= SLOTS) return
    out.set([rgb[0], rgb[1], rgb[2], Math.max(1, Math.round((shares[i] / top) * 255))], i * 4)
  })
  return out
}
