/**
 * The maths behind the light that follows the music, kept pure so it can be tested without audio.
 */

/** Root mean square of one block of samples. */
export function rms(samples: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return samples.length ? Math.sqrt(sum / samples.length) : 0
}

/** Digital level where the meter reads 0 VU (the usual broadcast alignment). */
export const ZERO_VU_DBFS = -18
export const VU_MIN = -20
export const VU_MAX = 3

/** A level in VU, clamped to the meter's scale. */
export function toVu(level: number): number {
  const dbfs = level > 1e-6 ? 20 * Math.log10(level) : -120
  return Math.max(VU_MIN, Math.min(VU_MAX, dbfs - ZERO_VU_DBFS))
}

/**
 * Where the needle sits along its travel (0 to 1) for a reading in VU. A real VU face is
 * spaced by voltage, so 0 VU sits about 71% of the way and -20 VU near the rest pin.
 */
export function needlePosition(vu: number): number {
  const v = Math.max(VU_MIN, Math.min(VU_MAX, vu))
  const p = Math.pow(10, (v - VU_MAX) / 20)
  const rest = Math.pow(10, (VU_MIN - VU_MAX) / 20)
  return (p - rest) / (1 - rest)
}

/**
 * A needle's swing: it follows the reading with the slow, even response of a VU meter (about
 * 300 ms to settle), the same rising and falling.
 */
export function follow(current: number, target: number, dtSeconds: number, tau = 0.11): number {
  const k = 1 - Math.exp(-Math.max(0, dtSeconds) / tau)
  return current + (target - current) * k
}

/**
 * Energy for the light, 0 to 1: louder music gives more, with quiet passages still moving a
 * little. Rises faster than it falls, so the room breathes with the music rather than flickers.
 */
export function energyStep(current: number, level: number, dtSeconds: number): number {
  const target = Math.max(0, Math.min(1, (toVu(level) - VU_MIN) / (VU_MAX - VU_MIN)))
  return follow(current, target, dtSeconds, target > current ? 0.18 : 0.6)
}

/**
 * A kick: how far the low end jumps above its own recent average. Returns the new average and
 * the pulse (0 to 1), which the caller lets fade.
 */
export function bassPulse(avg: number, bass: number, dtSeconds: number): { avg: number; pulse: number } {
  const next = follow(avg, bass, dtSeconds, 0.45)
  const pulse = avg > 1e-4 ? Math.max(0, Math.min(1, (bass / avg - 1.25) * 1.6)) : 0
  return { avg: next, pulse }
}
