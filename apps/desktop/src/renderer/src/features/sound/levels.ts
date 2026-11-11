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

/** dBFS of a linear level, floored at -90. */
export const toDb = (level: number): number => (level > 3.2e-5 ? 20 * Math.log10(level) : -90)

/** Follows up and down at different speeds. */
export function followAR(current: number, target: number, dt: number, attack: number, release: number): number {
  return follow(current, target, dt, target > current ? attack : release)
}

/** A song's loudness range, in dBFS. */
export interface Range {
  floor: number
  ceil: number
}
export const RANGE_START: Range = { floor: -42, ceil: -18 }

/**
 * The song's own loudness range. The ceiling jumps up quickly and sinks slowly (12 s); the floor
 * drops quickly and rises slowly (20 s). Silence (below -60 dBFS) does not move it.
 */
export function rangeStep(r: Range, db: number, dt: number): Range {
  if (db < -60) return r
  const ceil = followAR(r.ceil, db, dt, 0.3, 12)
  const floor = followAR(r.floor, db, dt, 20, 2) // attack here means "rising"
  return { ceil: Math.max(ceil, -40), floor: Math.min(floor, ceil - 12) }
}

/** 0..1 inside the song's range, eased so the middle of the range is the most responsive. */
export function relativeLevel(r: Range, db: number): number {
  if (db < -60) return 0
  const x = Math.max(0, Math.min(1, (db - r.floor) / Math.max(12, r.ceil - r.floor)))
  return x * x * (3 - 2 * x)
}

export interface Onset {
  avgFlux: number
  prev: number
  sinceLast: number
  interval: number
}
export const ONSET_START: Onset = { avgFlux: 0, prev: 0, sinceLast: 1, interval: 1 }

/**
 * A kick: the low band rising faster than it usually does. Returns the new state and a strength
 * (0 when there is no onset). At most one onset every 180 ms.
 */
export function onsetStep(s: Onset, bass: number, dt: number): { state: Onset; strength: number } {
  const flux = Math.max(0, bass - s.prev)
  const avgFlux = follow(s.avgFlux, flux, dt, 1.5)
  const threshold = avgFlux * 1.8 + 0.02
  const sinceLast = s.sinceLast + dt
  let strength = 0
  let interval = s.interval
  if (flux > threshold && sinceLast >= 0.18) {
    strength = Math.max(0, Math.min(1, (flux / threshold - 1) * 0.8))
    interval = follow(s.interval, sinceLast, 1, 2) // smoothed gap between kicks
  }
  return { state: { avgFlux, prev: bass, sinceLast: strength > 0 ? 0 : sinceLast, interval }, strength }
}

/** Kicks faster than 3 a second each count for less (a photosensitivity guard). */
export const kickRateScale = (interval: number): number => Math.min(1, interval / 0.333)

/** Mean of byte-frequency bins between two frequencies, 0..1. */
export function bandLevel(bins: Uint8Array, hzPerBin: number, fromHz: number, toHz: number): number {
  const a = Math.max(1, Math.round(fromHz / hzPerBin))
  const b = Math.min(bins.length - 1, Math.max(a, Math.round(toHz / hzPerBin)))
  let sum = 0
  for (let i = a; i <= b; i++) sum += bins[i]
  return sum / ((b - a + 1) * 255)
}
