import { memo, useEffect, useState } from 'react'

/**
 * Match the album, still: the cover's colours as a soft glow behind the room. Shown when
 * Moving light is off, and as Moving light's fallback (no WebGL, lost context, unreadable
 * cover). It never animates.
 *
 * The cover is drawn once into a small canvas with the blur and saturation baked in (about
 * 2 ms), and that tiny image is shown scaled up: painted once, no per-frame blur.
 */

const SIZE = 160
const cache = new Map<string, string>()

export function bakeAmbient(artworkUrl: string): Promise<string> {
  const hit = cache.get(artworkUrl)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!artworkUrl.startsWith('data:')) img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas'))
        // Blur and saturate once here, so nothing is filtered while it moves.
        ctx.filter = 'blur(14px) saturate(1.7)'
        // Draw a little larger than the canvas so the blurred edge never shows.
        ctx.drawImage(img, -SIZE * 0.15, -SIZE * 0.15, SIZE * 1.3, SIZE * 1.3)
        const url = canvas.toDataURL('image/jpeg', 0.86)
        if (cache.size > 24) cache.delete(cache.keys().next().value as string)
        cache.set(artworkUrl, url)
        resolve(url)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('cover failed to load'))
    img.src = artworkUrl
  })
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
