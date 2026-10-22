/**
 * The Kissa mark beside the wordmark. The images are made by scripts/make-brand-marks.py from the
 * desktop app's icon artwork (its small-size version, which reads at 26-30 CSS px), one per
 * device-pixel size, so the browser shows each at 1:1 instead of rescaling.
 */
export type BrandMarkSize = 26 | 28 | 30

const DENSITIES = [1, 1.25, 1.5, 2, 3]

/** Matches Python's round() in the asset script (halves go to the even number). */
function devicePixels(css: number, density: number): number {
  const v = css * density
  const floor = Math.floor(v)
  if (v - floor !== 0.5) return Math.round(v)
  return floor % 2 === 0 ? floor : floor + 1
}

export function brandMark(base: string, size: BrandMarkSize): { src: string; srcSet: string } {
  const url = (px: number): string => `${base}brand/kissa-mark-${px}.png`
  return {
    src: url(size),
    srcSet: DENSITIES.map((d) => `${url(devicePixels(size, d))} ${d}x`).join(', ')
  }
}
