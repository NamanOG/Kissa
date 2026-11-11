import { memo, useEffect, useState } from 'react'
import { coverBitmap } from '@renderer/utils/coverBitmap'

/**
 * Match the album, still: the cover's colours as a soft glow behind the room. Shown when
 * Moving light is off, and as Moving light's fallback (no WebGL, lost context, unreadable
 * cover). It never animates.
 *
 * The cover is drawn once into a small canvas with the blur and saturation baked in, in a worker
 * (ambientBake.worker.ts), and that tiny image is shown scaled up: painted once, no per-frame blur.
 */

const SIZE = 160
const cache = new Map<string, string>()

/** The bake runs in a worker where the browser allows it (Kissa's window does); else here. */
let worker: Worker | null | undefined
let nextId = 0
const waiting = new Map<number, { resolve: (blob: Blob) => void; reject: (e: Error) => void }>()

function bakeWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') throw new Error('no worker')
    worker = new Worker(new URL('./ambientBake.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const job = waiting.get(e.data.id)
      if (!job) return
      waiting.delete(e.data.id)
      if (e.data.blob) job.resolve(e.data.blob)
      else job.reject(new Error(e.data.error || 'bake failed'))
    }
    worker.onerror = () => {
      // A worker that cannot start: every waiting bake falls back to the main thread.
      for (const [, job] of waiting) job.reject(new Error('worker failed'))
      waiting.clear()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

/**
 * A cover image made in the worker (ambientBake.worker.ts): 'ambient' for the room light, 'thumb'
 * for the Record Crate. Null where workers are unavailable (the caller then works on this thread).
 */
export function imageInWorker(url: string, size: number, mode: 'ambient' | 'thumb', quality?: number): Promise<Blob> | null {
  const w = bakeWorker()
  if (!w) return null
  const id = ++nextId
  return new Promise<Blob>((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    w.postMessage({ id, url: new URL(url, location.href).href, size, mode, quality })
  })
}

function remember(artworkUrl: string, url: string): string {
  cache.set(artworkUrl, url)
  while (cache.size > 24) {
    const oldest = cache.keys().next().value as string
    const old = cache.get(oldest)
    cache.delete(oldest)
    if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
  }
  return url
}

function bakeHere(artworkUrl: string): Promise<string> {
  return coverBitmap(artworkUrl).then((img) => {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    // Blur and saturate once here, so nothing is filtered while it moves.
    ctx.filter = 'blur(14px) saturate(1.7)'
    // Draw a little larger than the canvas so the blurred edge never shows.
    ctx.drawImage(img, -SIZE * 0.15, -SIZE * 0.15, SIZE * 1.3, SIZE * 1.3)
    return remember(artworkUrl, canvas.toDataURL('image/jpeg', 0.86))
  })
}

export function bakeAmbient(artworkUrl: string): Promise<string> {
  const hit = cache.get(artworkUrl)
  if (hit) return Promise.resolve(hit)
  const job = imageInWorker(artworkUrl, SIZE, 'ambient')
  if (!job) return bakeHere(artworkUrl)
  return job.then(
    (blob) => remember(artworkUrl, URL.createObjectURL(blob)),
    () => bakeHere(artworkUrl)
  )
}
export const AmbientDrift = memo(({ artworkUrl }: { artworkUrl: string }) => {
  const [baked, setBaked] = useState<string | null>(() => cache.get(artworkUrl) ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFailed(false)
    // Never show the previous track's colours while the new cover is read.
    setBaked(cache.get(artworkUrl) ?? null)
    bakeAmbient(artworkUrl)
      .then((url) => alive && setBaked(url))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [artworkUrl])

  if (failed || !baked) {
    // The cover cannot be read into a canvas (or is still loading): the previous still glow.
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        data-ambient="still"
        style={{
          backgroundImage: `url(${artworkUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(100px) saturate(1.8) contrast(1.1)',
          transform: 'scale(1.2)'
        }}
      />
    )
  }

  const layer = {
    backgroundImage: `url(${baked})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } as const

  return <div className="absolute -inset-[10%] pointer-events-none" data-ambient="still" style={layer} />
})

AmbientDrift.displayName = 'AmbientDrift'
