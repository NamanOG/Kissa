/**
 * How the room's light changes through the day, from the local clock only (no location, no
 * network). Morning is a touch cooler, afternoon neutral, evening warm and a little lower,
 * late night warm and dim. Values are 0-1 and change smoothly minute by minute.
 */
export interface DaylightTint {
  warm: number
  cool: number
  dim: number
}

// [hour, warm, cool, dim]
const KEYS: [number, number, number, number][] = [
  [0, 0.55, 0, 0.18],
  [5, 0.5, 0, 0.16],
  [6.5, 0.15, 0.25, 0.04],
  [8, 0, 0.3, 0],
  [10, 0, 0.12, 0],
  [13, 0, 0, 0],
  [16, 0.2, 0, 0],
  [18, 0.55, 0, 0.02],
  [19.5, 0.7, 0, 0.08],
  [21, 0.65, 0, 0.12],
  [23, 0.58, 0, 0.17],
  [24, 0.55, 0, 0.18]
]

const smooth = (t: number): number => t * t * (3 - 2 * t)

export function daylightAt(date: Date): DaylightTint {
  const hour = date.getHours() + date.getMinutes() / 60
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, w0, c0, d0] = KEYS[i]
    const [h1, w1, c1, d1] = KEYS[i + 1]
    if (hour >= h0 && hour <= h1) {
      const t = smooth((hour - h0) / (h1 - h0))
      const mix = (a: number, b: number): number => Math.round((a + (b - a) * t) * 1000) / 1000
      return { warm: mix(w0, w1), cool: mix(c0, c1), dim: mix(d0, d1) }
    }
  }
  return { warm: 0, cool: 0, dim: 0 }
}
