/**
 * One small, already decoded copy of a cover for everything that reads its colours.
 *
 * On a song change the room light, Moving light, the record's pressing and the adaptive tint
 * each read the new cover. Each used to draw the full-size image (often 600-1200 px) down on the
 * main thread: about 36 ms of blocking per song for a 1200 px cover, measured 2026-11-09 in
 * headless Edge (docs/experiments/polish-2026-11-09/perf-stability.md). createImageBitmap with a
 * resize decodes and scales off the main thread, and the readers then draw from a 320 px copy
 * (about 6 ms for all of them together).
 */
export const COVER_BITMAP_PX = 320

type Drawable = ImageBitmap | HTMLImageElement

const cache = new Map<string, Promise<Drawable>>()
const CACHE_LIMIT = 4

function viaImage(url: string): Promise<Drawable> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!url.startsWith('data:')) img.crossOrigin = 'Anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('cover failed to load'))
    img.src = url
  })
}

async function viaBitmap(url: string): Promise<Drawable> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return viaImage(url)
  try {
    const res = await fetch(url, url.startsWith('data:') ? undefined : { mode: 'cors' })
    if (!res.ok) throw new Error(`cover ${res.status}`)
    const blob = await res.blob()
    return await createImageBitmap(blob, {
      resizeWidth: COVER_BITMAP_PX,
      resizeHeight: COVER_BITMAP_PX,
      resizeQuality: 'high'
    })
  } catch {
    // An address that will not fetch (no CORS, odd scheme) still works as a plain image.
    return viaImage(url)
  }
}

/** A decoded, square copy of the cover, shared by every reader of the same address. */
export function coverBitmap(url: string): Promise<Drawable> {
  const hit = cache.get(url)
  if (hit) {
    // Most recently used goes to the back.
    cache.delete(url)
    cache.set(url, hit)
    return hit
  }
  const next = viaBitmap(url)
  next.catch(() => cache.delete(url))
  cache.set(url, next)
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
  return next
}
