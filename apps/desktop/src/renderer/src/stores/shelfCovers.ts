/**
 * Shelf covers are kept small. A cover from a music app can arrive as a full-size
 * data: URL (often 150 KB, sometimes over 1 MB). The shelf only shows covers at a
 * few hundred pixels, so it keeps a 512 px JPEG instead, which keeps the saved
 * shelf small and quick to save.
 */

export const SHELF_COVER_MAX_PX = 512
/** Data URLs at or below this length (about 90 KB) are already small enough. */
export const SHELF_COVER_SHRINK_ABOVE = 120_000

const CACHE_LIMIT = 24
/** Source data URL -> smaller copy (or the source itself when it can't shrink). */
const shrunk = new Map<string, string>()
const inFlight = new Set<string>()

export function needsShrink(url: string | undefined): url is string {
  return !!url && url.startsWith('data:image/') && url.length > SHELF_COVER_SHRINK_ABOVE
}

/** The smaller copy of a cover already made this session, or the cover itself. */
export function knownSmallCover(url: string | undefined): string | undefined {
  if (!url) return url
  return shrunk.get(url) ?? url
}

function remember(source: string, small: string): void {
  shrunk.set(source, small)
  if (shrunk.size > CACHE_LIMIT) {
    const oldest = shrunk.keys().next().value
    if (oldest !== undefined) shrunk.delete(oldest)
  }
}

function encodeSmall(url: string): Promise<string | null> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const w0 = img.naturalWidth
        const h0 = img.naturalHeight
        if (!w0 || !h0) return resolve(null)
        const scale = Math.min(1, SHELF_COVER_MAX_PX / Math.max(w0, h0))
        const w = Math.max(1, Math.round(w0 * scale))
        const h = Math.max(1, Math.round(h0 * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.fillStyle = '#1a1411' // under any transparent edge, like the shelf sleeve
        ctx.fillRect(0, 0, w, h)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        const out = canvas.toDataURL('image/jpeg', 0.86)
        resolve(out.startsWith('data:image/jpeg') && out.length < url.length ? out : null)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Makes a small copy of a large data: cover off the current task, then calls
 * `apply(source, small)`. Each cover is encoded at most once per session.
 */
export function shrinkCoverLater(
  url: string | undefined,
  apply: (source: string, small: string) => void
): void {
  if (!needsShrink(url) || shrunk.has(url) || inFlight.has(url)) return
  inFlight.add(url)
  void encodeSmall(url).then((small) => {
    inFlight.delete(url)
    remember(url, small ?? url)
    if (small) apply(url, small)
  })
}

/** For tests. */
export function resetShelfCoverCache(): void {
  shrunk.clear()
  inFlight.clear()
}
