/**
 * Small copies of covers for the crate. Covers arrive at up to 1200 px; the crate shows them at
 * 320 px or less, and fifteen full-size images moving in 3D made flipping stutter. Each cover is
 * scaled once to THUMB px and kept for the session.
 */
import { useEffect, useState } from 'react'

const THUMB = 420
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

function makeThumb(url: string): Promise<string> {
  const known = pending.get(url)
  if (known) return known
  const job = new Promise<string>((resolve) => {
    const img = new Image()
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        if (Math.max(img.naturalWidth, img.naturalHeight) <= THUMB) return resolve(url)
        const c = document.createElement('canvas')
        c.width = c.height = THUMB
        const ctx = c.getContext('2d')
        if (!ctx) return resolve(url)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, THUMB, THUMB)
        c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : url), 'image/jpeg', 0.88)
      } catch {
        resolve(url) // a cover that cannot be read back is shown as it is
      }
    }
    img.onerror = () => resolve(url)
    img.src = url
  }).then((t) => {
    cache.set(url, t)
    pending.delete(url)
    return t
  })
  pending.set(url, job)
  return job
}

/** The crate-sized copy of a cover; the original until the copy is ready. */
export function useCrateThumb(url: string | undefined): string | undefined {
  const [thumb, setThumb] = useState(() => (url ? cache.get(url) : undefined))
  useEffect(() => {
    if (!url) return
    const hit = cache.get(url)
    if (hit) {
      setThumb(hit)
      return
    }
    let live = true
    void makeThumb(url).then((t) => live && setThumb(t))
    return () => {
      live = false
    }
  }, [url])
  return url ? (thumb ?? url) : undefined
}
