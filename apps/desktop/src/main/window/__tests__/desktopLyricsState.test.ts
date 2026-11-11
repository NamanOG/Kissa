import { describe, expect, it } from 'vitest'
import {
  DESKTOP_LYRICS_SIZES,
  parseDesktopLyrics,
  placeDesktopLyrics,
  sanitizeDesktopLyricsFrame
} from '../desktopLyricsState'

const primary = { x: 0, y: 0, width: 1920, height: 1040 }
const right = { x: 1920, y: 0, width: 2560, height: 1400 }
const displays = [
  { id: 1, workArea: primary },
  { id: 2, workArea: right }
]
const M = DESKTOP_LYRICS_SIZES.m

describe('placeDesktopLyrics', () => {
  it('opens low in the middle of the primary screen the first time', () => {
    const b = placeDesktopLyrics({ x: null, y: null, displayId: null, size: 'm' }, displays, primary)
    expect(b.width).toBe(M.width)
    expect(b.x).toBe(Math.round((1920 - M.width) / 2))
    expect(b.y + b.height).toBeLessThanOrEqual(1040)
    expect(b.y).toBeGreaterThan(1040 / 2)
  })

  it('keeps a saved spot on a second screen', () => {
    const b = placeDesktopLyrics({ x: 2400, y: 900, displayId: 2, size: 'm' }, displays, primary)
    expect(b).toEqual({ x: 2400, y: 900, width: M.width, height: M.height })
  })

  it('pulls a window hanging off the edge fully onto its screen', () => {
    const b = placeDesktopLyrics({ x: 1920 + 2560 - 300, y: 1350, displayId: 2, size: 'm' }, [displays[1]], primary)
    // Its centre is past the edge, so the display id brings it back to that screen's default spot.
    expect(b.x).toBeGreaterThanOrEqual(1920)
    expect(b.x + b.width).toBeLessThanOrEqual(1920 + 2560)
    expect(b.y + b.height).toBeLessThanOrEqual(1400)
  })

  it('clamps a spot whose centre is on screen but whose edge is not', () => {
    const b = placeDesktopLyrics({ x: -200, y: 900, displayId: 1, size: 'm' }, displays, primary)
    expect(b.x).toBe(0)
    expect(b.y).toBe(1040 - M.height)
  })

  it('returns to the primary screen when the saved screen was unplugged', () => {
    const b = placeDesktopLyrics({ x: 2400, y: 900, displayId: 2, size: 'm' }, [displays[0]], primary)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(1920)
  })

  it('never makes the window larger than a small screen', () => {
    const tiny = { x: 0, y: 0, width: 800, height: 600 }
    const b = placeDesktopLyrics({ x: null, y: null, displayId: null, size: 'l' }, [{ id: 9, workArea: tiny }], tiny)
    expect(b.width).toBeLessThanOrEqual(800)
    expect(b.x).toBeGreaterThanOrEqual(0)
  })
})

describe('parseDesktopLyrics', () => {
  it('is off by default and tolerates junk', () => {
    expect(parseDesktopLyrics(null)).toMatchObject({ enabled: false, locked: false, size: 'm', x: null })
    expect(parseDesktopLyrics({ enabled: 'yes', size: 'xl', x: 'a', y: 3 })).toMatchObject({
      enabled: false,
      size: 'm',
      x: null,
      y: null
    })
  })

  it('reads a saved state', () => {
    expect(parseDesktopLyrics({ enabled: true, locked: true, size: 'l', x: 10.4, y: 20, displayId: 7 })).toEqual({
      version: 1,
      enabled: true,
      locked: true,
      size: 'l',
      x: 10,
      y: 20,
      displayId: 7
    })
  })
})

describe('sanitizeDesktopLyricsFrame', () => {
  it('keeps short plain text and a hex colour only', () => {
    const f = sanitizeDesktopLyricsFrame({ visible: true, current: 'a\u0007b', next: 'x'.repeat(500), accent: 'red' })
    expect(f.current).toBe('a b')
    expect(f.next.length).toBe(300)
    expect(f.accent).toBeUndefined()
  })

  it('is hidden when there is nothing to show or the input is not an object', () => {
    expect(sanitizeDesktopLyricsFrame({ visible: true, current: '', next: '' }).visible).toBe(false)
    expect(sanitizeDesktopLyricsFrame('nope')).toEqual({ visible: false, current: '', next: '' })
  })
})

describe('desktopLyricsPage', () => {
  it('builds a page whose script compiles and reports to the given address', async () => {
    const { desktopLyricsPage } = await import('../desktopLyricsPage')
    const html = desktopLyricsPage('https://kissa.invalid/dl/')
    const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'))
    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain("location.href='https://kissa.invalid/dl/'")
    expect(script).toContain('window.render')
    expect(script).toContain('window.configure')
    // Words go in as text, never as markup.
    expect(script).toContain('cur.textContent=f.current')
    expect(html).not.toMatch(/https?:\/\/(?!kissa\.invalid)/)
  })
})

describe('sanitizeDesktopLyricsFrame word timings', () => {
  it('keeps sane word timings and drops bad ones', () => {
    const f = sanitizeDesktopLyricsFrame({
      visible: true,
      current: 'a b',
      next: '',
      lineStart: 12,
      elapsed: 0.4,
      words: [
        { text: 'a', start: 0, end: 0.5 },
        { text: 'b', start: 0.5, end: Number.NaN },
        { text: '', start: 0, end: 1 },
        'junk',
        { text: 'c', start: 1, end: 0.2 }
      ]
    })
    expect(f.lineStart).toBe(12)
    expect(f.elapsed).toBe(0.4)
    expect(f.words).toEqual([
      { text: 'a', start: 0, end: 0.5 },
      { text: 'c', start: 1, end: 1 }
    ])
  })
})
