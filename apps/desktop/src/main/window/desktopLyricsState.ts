import { promises as fs, readFileSync } from 'fs'
import type { DesktopLyricsFrame, DesktopLyricsSize, DesktopLyricsWord } from '../../types/desktopLyrics'
import type { Rect } from './windowState'

/**
 * Saved state of the Desktop lyrics window (userData/desktop-lyrics.json) and the pure
 * helpers around it: where to place the window, and what the renderer may send it.
 * Nothing here touches Electron, so it is tested directly.
 */
export interface StoredDesktopLyrics {
  version: 1
  enabled: boolean
  locked: boolean
  size: DesktopLyricsSize
  /** Top-left corner in screen coordinates, or null for the default place. */
  x: number | null
  y: number | null
  /** The display the window was on, so it can return there after the layout changes. */
  displayId: number | null
}

export const DEFAULT_DESKTOP_LYRICS: StoredDesktopLyrics = {
  version: 1,
  enabled: false,
  locked: false,
  size: 'm',
  x: null,
  y: null,
  displayId: null
}

/** Window size per text size. Wide enough for a long line on two rows, nothing more. */
export const DESKTOP_LYRICS_SIZES: Record<DesktopLyricsSize, { width: number; height: number }> = {
  s: { width: 760, height: 132 },
  m: { width: 940, height: 164 },
  l: { width: 1160, height: 204 }
}

export interface DisplayArea {
  id: number
  workArea: Rect
}

const isSize = (v: unknown): v is DesktopLyricsSize => v === 's' || v === 'm' || v === 'l'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseDesktopLyrics(raw: unknown): StoredDesktopLyrics {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DESKTOP_LYRICS }
  const r = raw as Record<string, unknown>
  const hasPos = isNum(r.x) && isNum(r.y)
  return {
    version: 1,
    enabled: r.enabled === true,
    locked: r.locked === true,
    size: isSize(r.size) ? r.size : 'm',
    x: hasPos ? Math.round(r.x as number) : null,
    y: hasPos ? Math.round(r.y as number) : null,
    displayId: isNum(r.displayId) ? r.displayId : null
  }
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi))

/** Low in the middle of a screen, where subtitles sit. */
function defaultSpot(area: Rect, width: number, height: number): Rect {
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + area.height * 0.86 - height),
    width,
    height
  }
}

/**
 * Where the window opens. A saved spot is kept while its centre is still on a screen, and
 * pulled fully onto that screen. When that screen is gone (unplugged, rearranged) the window
 * goes to the same display by id if it still exists, otherwise to the primary display.
 */
export function placeDesktopLyrics(
  saved: Pick<StoredDesktopLyrics, 'x' | 'y' | 'displayId' | 'size'>,
  displays: DisplayArea[],
  primary: Rect
): Rect {
  const { width: w0, height: h0 } = DESKTOP_LYRICS_SIZES[saved.size]
  if (saved.x !== null && saved.y !== null) {
    const cx = saved.x + w0 / 2
    const cy = saved.y + h0 / 2
    const home = displays.find(
      (d) =>
        cx >= d.workArea.x &&
        cx < d.workArea.x + d.workArea.width &&
        cy >= d.workArea.y &&
        cy < d.workArea.y + d.workArea.height
    )
    if (home) {
      const a = home.workArea
      const width = Math.min(w0, a.width)
      const height = Math.min(h0, a.height)
      return {
        x: clamp(saved.x, a.x, a.x + a.width - width),
        y: clamp(saved.y, a.y, a.y + a.height - height),
        width,
        height
      }
    }
  }
  const same = saved.displayId !== null ? displays.find((d) => d.id === saved.displayId) : undefined
  const area = same?.workArea ?? primary
  return defaultSpot(area, Math.min(w0, area.width), Math.min(h0, area.height))
}

const HEX = /^#[0-9a-f]{6}$/i

/** Only plain short text and a colour reach the page; anything else becomes an empty frame. */
export function sanitizeDesktopLyricsFrame(raw: unknown): DesktopLyricsFrame {
  if (!raw || typeof raw !== 'object') return { visible: false, current: '', next: '' }
  const r = raw as Record<string, unknown>
  const line = (v: unknown): string =>
    typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) : ''
  const current = line(r.current)
  const next = line(r.next)
  const frame: DesktopLyricsFrame = {
    visible: r.visible === true && Boolean(current || next),
    current,
    next,
    accent: typeof r.accent === 'string' && HEX.test(r.accent) ? r.accent : undefined
  }
  const time = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 36_000 ? v : null
  const lineStart = time(r.lineStart)
  const elapsed = time(r.elapsed)
  if (lineStart !== null) frame.lineStart = lineStart
  if (elapsed !== null) frame.elapsed = elapsed
  if (Array.isArray(r.words) && current) {
    const words: DesktopLyricsWord[] = []
    for (const w of r.words.slice(0, 80)) {
      if (!w || typeof w !== 'object') continue
      const o = w as Record<string, unknown>
      const text = line(o.text).slice(0, 60)
      const start = time(o.start)
      const end = time(o.end)
      if (!text || start === null || end === null || end > 60) continue
      words.push({ text, start, end: Math.max(start, end) })
    }
    if (words.length) frame.words = words
  }
  return frame
}

export function readDesktopLyrics(file: string): StoredDesktopLyrics {
  try {
    return parseDesktopLyrics(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return { ...DEFAULT_DESKTOP_LYRICS }
  }
}

export async function writeDesktopLyrics(file: string, state: StoredDesktopLyrics): Promise<void> {
  const tmp = `${file}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(state), 'utf8')
    await fs.rename(tmp, file)
  } catch {
    // A lost position is harmless.
  }
}
