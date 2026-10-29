import { describe, expect, it } from 'vitest'
import { firstRunBounds, parseWindowState, resolveInitialBounds } from '../windowState'

const MIN = { width: 600, height: 500 }
const LAPTOP = { x: 0, y: 0, width: 1536, height: 816 } // 1920x1080 at 125%, taskbar removed
const BIG = { x: 0, y: 0, width: 2560, height: 1400 }
const RIGHT = { x: 1536, y: 0, width: 1920, height: 1040 }

describe('firstRunBounds', () => {
  it('fills most of a laptop screen and centres it', () => {
    const b = firstRunBounds(LAPTOP, MIN)
    expect(b.width).toBe(Math.round(1536 * 0.74))
    expect(b.height).toBe(Math.round(816 * 0.8))
    expect(b.x).toBe(Math.round((1536 - b.width) / 2))
  })

  it('stops growing on a large monitor', () => {
    const b = firstRunBounds(BIG, MIN)
    expect(b.width).toBe(1480)
    expect(b.height).toBe(940)
  })

  it('never exceeds a tiny screen', () => {
    const b = firstRunBounds({ x: 0, y: 0, width: 640, height: 480 }, MIN)
    expect(b.width).toBeLessThanOrEqual(640)
    expect(b.height).toBeLessThanOrEqual(480)
  })
})

describe('resolveInitialBounds', () => {
  it('uses the first-run size when nothing is saved', () => {
    expect(resolveInitialBounds(null, [LAPTOP], LAPTOP, MIN)).toEqual({ bounds: firstRunBounds(LAPTOP, MIN), maximized: true })
  })

  it('reopens exactly where it was when that place is still on screen', () => {
    const saved = { version: 1 as const, bounds: { x: 1600, y: 40, width: 768, height: 800 }, maximized: false }
    expect(resolveInitialBounds(saved, [LAPTOP, RIGHT], LAPTOP, MIN).bounds).toEqual(saved.bounds)
  })

  it('keeps the maximized state', () => {
    const saved = { version: 1 as const, bounds: { x: 100, y: 50, width: 900, height: 700 }, maximized: true }
    expect(resolveInitialBounds(saved, [LAPTOP], LAPTOP, MIN).maximized).toBe(true)
  })

  it('moves back to the primary screen when the monitor it was on is gone', () => {
    const saved = { version: 1 as const, bounds: { x: 1700, y: 40, width: 900, height: 700 }, maximized: false }
    const r = resolveInitialBounds(saved, [LAPTOP], LAPTOP, MIN)
    expect(r.bounds).toEqual(firstRunBounds(LAPTOP, MIN))
  })

  it('pulls a window that hangs off the edge fully onto the screen', () => {
    const saved = { version: 1 as const, bounds: { x: 1200, y: 600, width: 900, height: 700 }, maximized: false }
    const r = resolveInitialBounds(saved, [LAPTOP], LAPTOP, MIN)
    expect(r.bounds.x + r.bounds.width).toBeLessThanOrEqual(1536)
    expect(r.bounds.y + r.bounds.height).toBeLessThanOrEqual(816)
    expect(r.bounds.width).toBe(900)
  })

  it('raises a saved size below the minimum', () => {
    const saved = { version: 1 as const, bounds: { x: 10, y: 10, width: 300, height: 200 }, maximized: false }
    const r = resolveInitialBounds(saved, [LAPTOP], LAPTOP, MIN)
    expect(r.bounds.width).toBe(600)
    expect(r.bounds.height).toBe(500)
  })
})

describe('parseWindowState', () => {
  it('rejects malformed files', () => {
    expect(parseWindowState(null)).toBeNull()
    expect(parseWindowState({ version: 2, bounds: { x: 0, y: 0, width: 1, height: 1 } })).toBeNull()
    expect(parseWindowState({ version: 1, bounds: { x: 'a', y: 0, width: 1, height: 1 } })).toBeNull()
    expect(parseWindowState({ version: 1, bounds: { x: 0, y: 0, width: -5, height: 1 } })).toBeNull()
  })

  it('accepts a valid file', () => {
    expect(parseWindowState({ version: 1, bounds: { x: 1.4, y: 2, width: 800, height: 600 }, maximized: true })).toEqual({
      version: 1,
      bounds: { x: 1, y: 2, width: 800, height: 600 },
      maximized: true
    })
  })
})
