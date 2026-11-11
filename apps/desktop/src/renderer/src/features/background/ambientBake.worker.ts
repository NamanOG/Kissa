/**
 * Cover images made off the main thread: decode and shrink the cover, then encode a small JPEG.
 * - 'ambient': the still room light (AmbientDrift), blurred and saturated, drawn a little larger
 *   so the blurred edge never shows. On the main thread this was ~40 ms per song change.
 * - 'thumb': a plain square copy for the Record Crate. Encoding it on the main thread cost
 *   ~58 ms on the crate's first view (both measured 2026-11-10, perf-stability.md).
 */
interface BakeRequest {
  id: number
  url: string
  size: number
  mode?: 'ambient' | 'thumb'
  quality?: number
}

// Typed locally: the webworker lib would change the app's own global types.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<BakeRequest>) => void) | null
  postMessage: (message: unknown) => void
}

scope.onmessage = async (e: MessageEvent<BakeRequest>): Promise<void> => {
  const { id, url, size, mode = 'ambient', quality = 0.86 } = e.data
  try {
    const blob = await (await fetch(url)).blob()
    const decodeSize = mode === 'thumb' ? size : 320
    const bitmap = await createImageBitmap(blob, { resizeWidth: decodeSize, resizeHeight: decodeSize, resizeQuality: 'high' })
    const canvas = new OffscreenCanvas(size, size)
    // On the CPU: a GPU canvas here blurred on the GPU and then read the pixels back for the
    // JPEG, which held the GPU process for ~0.4 s (the opening and every song change stalled,
    // measured 2026-11-11). A 160 px blur in software takes a few milliseconds.
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no 2d')
    if (mode === 'ambient') {
      ctx.filter = 'blur(14px) saturate(1.7)'
      ctx.drawImage(bitmap, -size * 0.15, -size * 0.15, size * 1.3, size * 1.3)
    } else {
      ctx.drawImage(bitmap, 0, 0, size, size)
    }
    bitmap.close()
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    scope.postMessage({ id, blob: out })
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
