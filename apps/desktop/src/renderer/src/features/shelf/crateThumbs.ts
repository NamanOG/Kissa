/**
 * Small copies of covers for the crate. Covers arrive at up to 1200 px; the crate shows them at
 * 460 px or less, and fifteen full-size images moving in 3D made flipping stutter. Each cover is
 * scaled once to THUMB px and kept for the session.
 */
import { useEffect, useState } from 'react'
import { imageInWorker } from '../background/AmbientDrift'

const THUMB = 600
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

/**
 * Decoded and scaled off the main thread (createImageBitmap with a resize), two covers at a time,
 * so the crate's first view no longer decodes fifteen large covers inside one frame (a 118 ms
 * frame measured headless, 2026-11-10). The old main-thread path stays as the fallback.
 */
let running = 0
const queue: Array<() => void> = []
function slot(): Promise<() => void> {
  return new Promise((resolve) => {
    const go = (): void => {
      running++
      resolve(() => {
        running--
        queue.shift()?.()
      })
    }
    if (running < 2) go()
    else queue.push(go)
  })
}

async function viaBitmap(url: string): Promise<string | null> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return null
  try {
    const blob = await (await fetch(url)).blob()
    if (blob.size < 60_000) return url // already small: show it as it is
    const bmp = await createImageBitmap(blob, { resizeWidth: THUMB, resizeHeight: THUMB, resizeQuality: 'high' })
    const c = document.createElement('canvas')
    c.width = c.height = THUMB
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bmp, 0, 0)
    bmp.close()
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88))
    return out ? URL.createObjectURL(out) : null
  } catch {
    return null
  }
}

function viaImage(url: string): Promise<string> {
  return new Promise<string>((resolve) => {
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
  })
}

function makeThumb(url: string): Promise<string> {
  const known = pending.get(url)
  if (known) return known
  const job = slot()
    .then(async (release) => {
      try {
        const job = imageInWorker(url, THUMB, 'thumb', 0.88)
        if (job) {
          try {
            return URL.createObjectURL(await job)
          } catch {
            /* fall through to this thread */
          }
        }
        return (await viaBitmap(url)) ?? (await viaImage(url))
      } finally {
        release()
      }
    })
    .then((t) => {
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
