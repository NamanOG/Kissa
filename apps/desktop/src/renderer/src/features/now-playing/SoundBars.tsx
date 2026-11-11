import { memo, useEffect, useRef } from 'react'
import { soundListener, type SoundLevels } from '@renderer/features/sound/soundListener'
import { followAR } from '@renderer/features/sound/levels'
import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { useWindowVisible } from '@renderer/hooks/useWindowVisible'
import { useSheetOpen } from '@renderer/features/background/sheetCount'
import { cn } from '@renderer/utils/cn'

const BARS = 4
const BAR_W = 3
const GAP = 3
const BOX_H = 16
/** One CSS pixel round the bars, so nothing is ever clipped. */
const PAD = 1
const CSS_W = BARS * BAR_W + (BARS - 1) * GAP + PAD * 2
const CSS_H = BOX_H + PAD * 2

/** The bars never fall below this share of the box: always a short bar, never a dot. */
export const MIN = 0.28
/** Reduced motion: a still mark. */
const STILL = [0.5, 0.85, 0.65, 0.42]
/** The envelope: up over 70 ms, down over 220 ms. */
const ATTACK_S = 0.07
const RELEASE_S = 0.22
/** The drawn height follows the envelope through a critically damped spring (settles in ~150 ms). */
const OMEGA = 27
/** Below this level the bars rest. */
const GATE = 0.05
/** Each bar's own automatic gain: its loudest and quietest moments over about 2.5 s. */
const AGC_S = 2.5
/** No step moves a bar by more than this share of its travel, even after a missed frame. */
const MAX_STEP = 0.1 * (1 - MIN)
/** Neighbouring bars lag each other by about 30 ms (two steps of the 60 Hz beat). */
const LAG_STEPS = 2

export interface BarState {
  peak: number[]
  floor: number[]
  env: number[]
  pos: number[]
  vel: number[]
  history: number[][]
}

export const newBarState = (): BarState => ({
  peak: new Array<number>(BARS).fill(0.6),
  floor: new Array<number>(BARS).fill(0.3),
  env: new Array<number>(BARS).fill(MIN),
  pos: new Array<number>(BARS).fill(MIN),
  vel: new Array<number>(BARS).fill(0),
  history: Array.from({ length: BARS }, () => [] as number[])
})

/** What each bar hears: one band each (low end, low mids, mids, kick) at 75 %, the level at 25 %. */
export function barInputs(l: SoundLevels): number[] {
  return [l.bass, l.lowMid, l.mid, l.kick].map((b) => 0.75 * b + 0.25 * l.level)
}

/**
 * One step of the bars: each bar's input normalised against its own recent range, eased up
 * (pow 1.15), delayed by its place in the row, then an envelope and a spring. Never below MIN.
 */
export function stepBars(state: BarState, inputs: number[], level: number, dt: number): void {
  for (let i = 0; i < BARS; i++) {
    const x = inputs[i]
    state.peak[i] = followAR(state.peak[i], x, dt, 0.03, AGC_S)
    state.floor[i] = followAR(state.floor[i], x, dt, AGC_S, 0.03)
    const span = Math.max(0.08, state.peak[i] - state.floor[i])
    const norm = level < GATE ? 0 : Math.max(0, Math.min(1, (x - state.floor[i]) / span))
    const target = MIN + (1 - MIN) * Math.pow(norm, 1.15)
    const h = state.history[i]
    h.push(target)
    if (h.length > LAG_STEPS * (BARS - 1) + 1) h.shift()
    const lagged = h[Math.max(0, h.length - 1 - i * LAG_STEPS)]
    state.env[i] = followAR(state.env[i], lagged, dt, ATTACK_S, RELEASE_S)
    const a = OMEGA * OMEGA * (state.env[i] - state.pos[i]) - 2 * OMEGA * state.vel[i]
    state.vel[i] += a * dt
    const move = Math.max(-MAX_STEP, Math.min(MAX_STEP, state.vel[i] * dt))
    state.pos[i] = Math.max(MIN, Math.min(1, state.pos[i] + move))
  }
}

/** Draws the bars: true rounded rects with full round caps, centred, snapped to device pixels. */
function draw(canvas: HTMLCanvasElement, heights: number[], colour: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = canvas.width / CSS_W
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = colour
  const w = Math.max(2, Math.round(BAR_W * dpr))
  const mid = canvas.height / 2
  for (let i = 0; i < BARS; i++) {
    const x = Math.round((PAD + i * (BAR_W + GAP)) * dpr)
    // Even device-pixel heights keep the bar centred on the same pixel row as it moves.
    const h = Math.max(w, 2 * Math.round((Math.max(MIN, Math.min(1, heights[i])) * BOX_H * dpr) / 2))
    const y = Math.round(mid - h / 2)
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, w / 2)
    ctx.fill()
  }
}

/**
 * The small visualizer that leads the "Playing from" line: four slim bars on a little canvas, in
 * a calm accent tint (the room's accent mixed with its text colour, so a red room never gets hard
 * red bars).
 *
 * - While music plays the bars listen to it themselves (the shared sound listener) and are drawn
 *   at 30 fps on its beat, skipping frames that change no pixel.
 * - Without the listener there is nothing to follow, so they rest as a still mark.
 * - Paused or under a sheet: equal short bars (28 %), eased. Reduced motion: a still mark.
 *   Nothing is drawn while the window is hidden, and a repaint that changes no pixel is skipped.
 */
export const SoundBars = memo(({ playing, className }: { playing: boolean; className?: string }) => {
  const reduce = useReducedMotion()
  const visible = useWindowVisible()
  const sheetOpen = useSheetOpen()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heights = useRef<number[]>(new Array<number>(BARS).fill(MIN))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(CSS_W * dpr)
    canvas.height = Math.round(CSS_H * dpr)
    let colour = getComputedStyle(canvas).color
    let frames = 0
    // The device-pixel heights last drawn: a repaint that would not change a pixel is skipped.
    let drawn = ''
    const paint = (force = false): void => {
      // The room's colour can change with the song: re-read it now and then, not every frame.
      if (++frames % 60 === 0) colour = getComputedStyle(canvas).color
      const key = heights.current.map((h) => Math.round(h * BOX_H * dpr)).join(',') + colour
      if (!force && key === drawn) return
      drawn = key
      draw(canvas, heights.current, colour)
    }
    let raf = 0
    /** Eases the bars to `to` over 400 ms, then stops drawing. */
    const settleTo = (to: number[]): (() => void) => {
      const from = heights.current.slice()
      const t0 = performance.now()
      const settle = (t: number): void => {
        const p = Math.min(1, Math.max(0, (t - t0) / 400))
        const e = 1 - Math.pow(1 - p, 3)
        heights.current = from.map((h, i) => h + (to[i] - h) * e)
        paint()
        if (p < 1) raf = requestAnimationFrame(settle)
      }
      raf = requestAnimationFrame(settle)
      return () => cancelAnimationFrame(raf)
    }

    if (reduce) {
      heights.current = STILL.slice()
      paint(true)
      return
    }
    // Paused, hidden or under a sheet: equal short bars.
    if (!playing || !visible || sheetOpen) return settleTo(new Array<number>(BARS).fill(MIN))

    // The bars listen for themselves while music plays (Moving light or not): measuring the sound
    // costs a few float operations a beat, and a still mark during playback read as broken.
    const release = soundListener.acquire()
    const state = newBarState()
    state.pos = heights.current.slice()
    let live = soundListener.status === 'live'
    let tick = 0
    // Until the listener is live (or if Windows will not share the sound) the bars rest as a still
    // mark rather than a made-up ripple.
    let stopSettle: (() => void) | null = live ? null : settleTo(STILL)
    const offStatus = soundListener.onStatus((s) => {
      live = s === 'live'
      if (!live && !stopSettle) stopSettle = settleTo(STILL)
    })
    const off = soundListener.subscribe((levels, dt) => {
      if (!live || dt <= 0) return
      if (stopSettle) {
        stopSettle()
        stopSettle = null
      }
      stepBars(state, barInputs(levels), levels.level, dt)
      heights.current = state.pos
      // Stepped at 60 Hz, drawn at 30: half the frames for the window to compose.
      if (++tick % 2 === 0) paint()
      if (import.meta.env.DEV) {
        const w = window as unknown as { __kissaBars?: number[][] }
        if (w.__kissaBars) w.__kissaBars.push(state.pos.slice())
      }
    })
    return () => {
      off()
      offStatus()
      release()
      cancelAnimationFrame(raf)
    }
  }, [playing, reduce, visible, sheetOpen])
  const mode = reduce ? 'still' : playing ? 'playing' : 'paused'
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-sound-bars={mode}
      width={CSS_W}
      height={CSS_H}
      style={{ width: CSS_W, height: CSS_H }}
      className={cn(
        'np-bars shrink-0 text-[color-mix(in_srgb,var(--accent)_60%,var(--on-surface))] opacity-80',
        className
      )}
    />
  )
})
SoundBars.displayName = 'SoundBars'
