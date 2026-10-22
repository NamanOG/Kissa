/**
 * "Match the Album" pressing: a record made for the album that is playing. An opt-in choice in
 * the record picker; the default record stays Classic Black, and the room's Match Album light is
 * separate.
 *
 * The cover's palette (the same reading Moving light uses) picks the style as well as the colour:
 * - two strong colours of different hue: a marble swirl of both,
 * - one strong colour: a translucent coloured pressing in that colour,
 * - a black-and-white or muted cover: smoke for light covers, black for dark ones.
 * Colours are kept in a range real coloured vinyl has (never neon, never white).
 */
import { useEffect, useState } from 'react'
import { extractPalette, oklabToRgb, rgbToOklab, type Swatch } from '@renderer/features/background/colourField'

export interface AlbumPressingPlan {
  style: 'marble' | 'colour' | 'smoke' | 'black'
  /** Main colour, and the second colour of a marble, as CSS hex. */
  a: string
  b?: string
  name: string
}

const hex = ([r, g, b]: [number, number, number]): string => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/** A palette colour as vinyl: lightness and chroma kept to what a pressing can look like. */
function asVinyl(rgb: [number, number, number], L = 0.5): [number, number, number] {
  const [, a, b] = rgbToOklab(...rgb)
  const c = Math.hypot(a, b)
  const k = c > 0 ? Math.min(1, 0.17 / c) * Math.min(1.4, Math.max(1, 0.12 / c)) : 0
  return oklabToRgb(L, a * k, b * k)
}

const chroma = (s: Swatch): number => {
  const [, a, b] = rgbToOklab(...s.rgb)
  return Math.hypot(a, b)
}
const hue = (s: Swatch): number => {
  const [, a, b] = rgbToOklab(...s.rgb)
  return Math.atan2(b, a)
}
const NAMES: Array<[number, string]> = [
  [-2.6, 'Blue'], [-1.9, 'Blue'], [-1.2, 'Violet'], [-0.4, 'Magenta'], [0.3, 'Red'], [0.9, 'Amber'], [1.4, 'Gold'],
  [2.0, 'Green'], [2.6, 'Teal'], [3.2, 'Blue']
]
function hueName(h: number): string {
  let best = NAMES[0]
  for (const n of NAMES) if (Math.abs(n[0] - h) < Math.abs(best[0] - h)) best = n
  return best[1]
}

/** Chooses the pressing for a cover's palette. Pure, for tests. */
export function planAlbumPressing(palette: Swatch[]): AlbumPressingPlan {
  const vivid = palette
    .filter((s) => chroma(s) > 0.06 && s.share >= 0.04)
    .sort((x, y) => chroma(y) * Math.sqrt(y.share) - chroma(x) * Math.sqrt(x.share))
  if (!vivid.length) {
    const light = palette.reduce((sum, s) => sum + rgbToOklab(...s.rgb)[0] * s.share, 0) > 0.6
    return light ? { style: 'smoke', a: '#5a5a60', name: 'Smoke' } : { style: 'black', a: '#1e1e1e', name: 'Classic Black' }
  }
  const first = vivid[0]
  const second = vivid.find((s) => {
    const d = Math.abs(hue(s) - hue(first))
    return Math.min(d, Math.PI * 2 - d) > 0.4 && s.share >= 0.06
  })
  const a = hex(asVinyl(first.rgb, 0.52))
  if (second) {
    const b = hex(asVinyl(second.rgb, 0.42))
    return { style: 'marble', a, b, name: `${hueName(hue(first))} & ${hueName(hue(second))} Marble` }
  }
  return { style: 'colour', a, name: `Translucent ${hueName(hue(first))}` }
}

// Value noise for the marble swirl (CPU, once per album).
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/** A 256 px marble texture of two colours, as a data URL (null where canvas is unavailable). */
export function paintMarble(a: string, b: string, seed = 0): string | null {
  if (typeof document === 'undefined') return null
  const N = 256
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(N, N)
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = x / N * 4 + seed
      const v = y / N * 4
      const w = noise(u * 1.3, v * 1.3) * 3
      const t = 0.5 + 0.5 * Math.sin((u + v) * 2.2 + w * 2.4 + noise(u * 3 + 5, v * 3) * 1.5)
      const m = t * t * (3 - 2 * t)
      const i = (y * N + x) * 4
      for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(ca[k] + (cb[k] - ca[k]) * m)
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/jpeg', 0.86)
}

export interface AlbumPressing extends AlbumPressingPlan {
  texture?: string
}

const cache = new Map<string, AlbumPressing>()

function readCover(url: string): Promise<Swatch[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!url.startsWith('data:')) img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const S = 48
      const c = document.createElement('canvas')
      c.width = c.height = S
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('no 2d'))
      ctx.drawImage(img, 0, 0, S, S)
      try {
        resolve(extractPalette(ctx.getImageData(0, 0, S, S).data, S, S))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('cover unreadable'))
      }
    }
    img.onerror = () => reject(new Error('cover failed'))
    img.src = url
  })
}

/** The pressing for the current cover, or null until it is read (or when not wanted). */
export function useAlbumPressing(artworkUrl: string | undefined, wanted: boolean): AlbumPressing | null {
  const [pressing, setPressing] = useState<AlbumPressing | null>(() => (artworkUrl && cache.get(artworkUrl)) || null)
  useEffect(() => {
    if (!wanted || !artworkUrl) return
    const hit = cache.get(artworkUrl)
    if (hit) {
      setPressing(hit)
      return
    }
    let live = true
    readCover(artworkUrl)
      .then((palette) => {
        const plan = planAlbumPressing(palette)
        const made: AlbumPressing = plan.style === 'marble' && plan.b ? { ...plan, texture: paintMarble(plan.a, plan.b, artworkUrl.length % 7) ?? undefined } : plan
        if (cache.size > 30) cache.clear()
        cache.set(artworkUrl, made)
        if (live) setPressing(made)
      })
      .catch(() => {
        if (live) setPressing(null)
      })
    return () => {
      live = false
    }
  }, [artworkUrl, wanted])
  return wanted ? pressing : null
}
