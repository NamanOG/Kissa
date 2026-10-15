import { nativeImage } from 'electron'

/**
 * Whether two cover images show the same artwork.
 *
 * Many albums use different art on different services (Metro Boomin's HEROES & VILLAINS,
 * deluxe and "Villains Version" editions, regional covers), so a catalogue entry with the
 * right album name can still have the wrong picture. Kissa only swaps the player's own
 * cover for a sharper catalogue copy when the two pictures match.
 *
 * Measured on real covers (16 x 16 colour thumbnails, mean channel difference 0..1):
 * the same cover at 300 px JPEG vs 1200 px is about 0.004; a deluxe edition with the
 * same art 0.034; different covers, even of the same album, 0.19 to 0.51.
 */
export const SAME_COVER_MAX_DISTANCE = 0.08

const SIZE = 16

/** Mean absolute RGB difference of two equally sized BGRA/RGBA bitmaps, 0..1. */
export function coverDistance(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) return 1
  let sum = 0
  let n = 0
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      sum += Math.abs(a[i + c] - b[i + c])
      n++
    }
  }
  return sum / n / 255
}

function thumbnail(image: Electron.NativeImage): Uint8Array | null {
  if (image.isEmpty()) return null
  const bitmap = image.resize({ width: SIZE, height: SIZE, quality: 'good' }).toBitmap()
  return bitmap.length === SIZE * SIZE * 4 ? new Uint8Array(bitmap) : null
}

/**
 * true: same artwork. false: different artwork. null: could not tell (an image did not
 * load), which callers treat as "keep the player's cover".
 */
export async function coversMatch(referenceDataUrl: string, candidateUrl: string): Promise<boolean | null> {
  try {
    const reference = thumbnail(nativeImage.createFromDataURL(referenceDataUrl))
    if (!reference) return null
    const res = await fetch(candidateUrl, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null
    const candidate = thumbnail(nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer())))
    if (!candidate) return null
    return coverDistance(reference, candidate) <= SAME_COVER_MAX_DISTANCE
  } catch {
    return null
  }
}
