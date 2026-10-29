import { describe, it, expect } from 'vitest'
import { LISTENING_ENVIRONMENTS } from '../themes'

// WCAG 2.1 relative luminance and contrast ratio.
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function rgba(s: string): number[] {
  return (s.match(/[\d.]+/g) ?? []).map(Number)
}

describe('room colours', () => {
  const rooms = LISTENING_ENVIRONMENTS.filter((room) => room.id !== 'adaptive')

  it.each(rooms.map((room) => [room.id, room]))(
    'keeps grey secondary text readable (WCAG AA 4.5:1) in %s',
    (_id, room) => {
      const muted = hex(room.mutedColor)
      const bg = hex(room.ambient.bgColor)
      expect(contrast(muted, bg)).toBeGreaterThanOrEqual(4.5)

      // The dock's glass, opaque over the room
      const [r, g, b, a] = rgba(room.ui.dockBg)
      const dock = [r, g, b].map((c, i) => Math.round(c * a + bg[i] * (1 - a)))
      expect(contrast(muted, dock)).toBeGreaterThanOrEqual(4.5)

      // Every solid colour the room's light is painted with
      for (const stop of room.ambient.gradient.match(/#[0-9a-f]{6}/gi) ?? []) {
        expect(contrast(muted, hex(stop))).toBeGreaterThanOrEqual(4.5)
      }
    }
  )
})
