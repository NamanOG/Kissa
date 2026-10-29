import { useEffect, useState } from 'react'

/** [hue 0-360, saturation 0-1, lightness 0-1] of a cover, from a 16 x 16 sample. */
export type Tone = [number, number, number]

const cache = new Map<string, Tone>()

export function rgbToHsl(r: number, g: number, b: number): Tone {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return [h, s, l]
}

/** Weights vivid pixels more, so a red title on a black sleeve still reads as red. */
export function toneFromPixels(data: Uint8ClampedArray): Tone {
  let r = 0, g = 0, b = 0, w = 0, lr = 0, lg = 0, lb = 0, n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const [, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    const weight = s * s * (1 - Math.abs(l - 0.5) * 1.6) + 0.001
    r += data[i] * weight
    g += data[i + 1] * weight
    b += data[i + 2] * weight
    w += weight
    lr += data[i]
    lg += data[i + 1]
    lb += data[i + 2]
    n++
  }
  if (!n) return [0, 0, 0.5]
  const [h, s] = rgbToHsl(r / w, g / w, b / w)
  const [, , l] = rgbToHsl(lr / n, lg / n, lb / n)
  return [h, w / n > 0.02 ? s : 0, l]
}

function measure(url: string): Promise<Tone | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 16
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, 16, 16)
        resolve(toneFromPixels(ctx.getImageData(0, 0, 16, 16).data))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Grey sleeves go last, light to dark; the rest run round the colour wheel from red. */
export function compareTones(a: Tone | undefined, b: Tone | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  const greyA = a[1] < 0.14
  const greyB = b[1] < 0.14
  if (greyA !== greyB) return greyA ? 1 : -1
  if (greyA) return b[2] - a[2]
  const hueA = (a[0] + 15) % 360
  const hueB = (b[0] + 15) % 360
  return Math.round(hueA / 12) - Math.round(hueB / 12) || b[2] - a[2]
}

/** Tones for the given covers, filled in as they are measured. Only runs while `active`. */
export function useCoverTones(items: { key: string; url?: string }[], active: boolean): Map<string, Tone> {
  const [, setVersion] = useState(0)
  useEffect(() => {
    if (!active) return
    let alive = true
    void (async () => {
      for (const { url } of items) {
        if (!alive) return
        if (!url || cache.has(url)) continue
        const tone = await measure(url)
        if (tone) cache.set(url, tone)
      }
      if (alive) setVersion((v) => v + 1)
    })()
    return () => {
      alive = false
    }
  }, [items, active])
  const out = new Map<string, Tone>()
  for (const { key, url } of items) {
    const tone = url ? cache.get(url) : undefined
    if (tone) out.set(key, tone)
  }
  return out
}
