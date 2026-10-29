import { promises as fs, readFileSync } from 'fs'

/**
 * Where the main window was when Kissa last closed, so it opens there again.
 *
 * Kept in its own small file in userData (not the renderer's storage) because the window
 * has to be placed before the page exists. Only the window's own geometry is stored.
 */
export interface StoredWindowState {
  version: 1
  /** Normal (restored) bounds, even when the window was maximized. */
  bounds: Rect
  maximized: boolean
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** The part of a window that must stay on a screen for it to count as reachable. */
const MIN_VISIBLE = { width: 160, height: 96 }

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseWindowState(raw: unknown): StoredWindowState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const b = r.bounds as Record<string, unknown> | undefined
  if (r.version !== 1 || !b) return null
  if (![b.x, b.y, b.width, b.height].every(isFiniteNumber)) return null
  if ((b.width as number) <= 0 || (b.height as number) <= 0) return null
  return {
    version: 1,
    bounds: {
      x: Math.round(b.x as number),
      y: Math.round(b.y as number),
      width: Math.round(b.width as number),
      height: Math.round(b.height as number)
    },
    maximized: r.maximized === true
  }
}

function overlap(a: Rect, b: Rect): Size {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return { width: Math.max(0, width), height: Math.max(0, height) }
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi))

/**
 * A first window that suits the screen: large enough for the deck to breathe on a big
 * monitor, never larger than the screen on a small laptop.
 */
export function firstRunBounds(workArea: Rect, min: Size): Rect {
  const width = clamp(Math.round(workArea.width * 0.74), Math.min(min.width, workArea.width), Math.min(1480, workArea.width))
  const height = clamp(Math.round(workArea.height * 0.8), Math.min(min.height, workArea.height), Math.min(940, workArea.height))
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  }
}

/**
 * Where to open the window. A saved position is reused only while enough of it is still
 * on one of the connected screens (a monitor may have been unplugged or rearranged);
 * otherwise the window opens centred on the primary screen.
 */
export function resolveInitialBounds(
  saved: StoredWindowState | null,
  workAreas: Rect[],
  primary: Rect,
  min: Size
): { bounds: Rect; maximized: boolean } {
  // First launch opens maximized; the centred size is what Restore goes back to.
  if (!saved) return { bounds: firstRunBounds(primary, min), maximized: true }

  // The screen that holds most of the saved window.
  let best: Rect | null = null
  let bestArea = 0
  for (const area of workAreas) {
    const o = overlap(saved.bounds, area)
    const size = o.width * o.height
    if (o.width >= MIN_VISIBLE.width && o.height >= MIN_VISIBLE.height && size > bestArea) {
      best = area
      bestArea = size
    }
  }
  if (!best) return { bounds: firstRunBounds(primary, min), maximized: saved.maximized }

  // Fit the size to that screen, then pull the window fully onto it.
  const width = clamp(saved.bounds.width, Math.min(min.width, best.width), best.width)
  const height = clamp(saved.bounds.height, Math.min(min.height, best.height), best.height)
  const x = clamp(saved.bounds.x, best.x, best.x + best.width - width)
  const y = clamp(saved.bounds.y, best.y, best.y + best.height - height)
  return { bounds: { x, y, width, height }, maximized: saved.maximized }
}

export function readWindowState(file: string): StoredWindowState | null {
  try {
    return parseWindowState(JSON.parse(readFileSync(file, 'utf8')))
  } catch {
    return null
  }
}

/** Written to a temporary file first, so a crash mid-write never leaves a broken file. */
export async function writeWindowState(file: string, state: StoredWindowState): Promise<void> {
  const tmp = `${file}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(state), 'utf8')
    await fs.rename(tmp, file)
  } catch {
    // Losing a window position is harmless; never let it disturb the app.
  }
}
