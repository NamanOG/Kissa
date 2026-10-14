/**
 * Shared plumbing for the Study Room environments: one 2D canvas, a lower internal
 * resolution, about 30 frames a second, nothing at all while Kissa is hidden, and a single
 * still frame under reduced motion.
 *
 * Every environment keeps time the same way, without numbers: `setProgress` (0..1 through
 * the current focus block) slowly changes the scene, and `reset` (a break or a new block)
 * returns it to its start.
 */

export interface StudyScene {
  resize(cssWidth: number, cssHeight: number): void
  /** 0..1 through the current focus block. */
  setProgress(progress: number): void
  /** A new segment began (break or block): ease the scene back to its start. */
  reset(): void
  /** Whether a session is running (slightly livelier) or not. */
  setActive(active: boolean): void
  start(): void
  stop(): void
  dispose(): void
}

const FRAME_MS = 1000 / 30
const RENDER_SCALE = 0.85

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Mixes two '#rrggbb' colours. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number): number => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

export abstract class SceneBase implements StudyScene {
  protected readonly ctx: CanvasRenderingContext2D
  protected width = 0
  protected height = 0
  /** Shown progress, easing towards `target`. */
  protected progress = 0
  protected target = 0
  protected active = false
  protected resetting = false
  private raf = 0
  private lastFrame = 0
  private running = false

  constructor(
    protected readonly canvas: HTMLCanvasElement,
    protected readonly reducedMotion: boolean
  ) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas unavailable')
    this.ctx = ctx
  }

  protected abstract build(): void
  protected abstract step(dt: number): void
  protected abstract draw(time: number): void

  public resize(cssWidth: number, cssHeight: number): void {
    const w = Math.max(1, Math.round(cssWidth * RENDER_SCALE))
    const h = Math.max(1, Math.round(cssHeight * RENDER_SCALE))
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.build()
    this.draw(performance.now())
  }

  private primed = false

  public setProgress(progress: number): void {
    this.target = Math.max(0, Math.min(1, progress))
    // The first value (opening the room mid-session) is shown as it is, not eased into.
    if (!this.primed) {
      this.primed = true
      this.progress = this.target
    }
    if (this.reducedMotion) this.renderStill()
  }

  public reset(): void {
    this.resetting = true
    this.target = 0
    if (this.reducedMotion) this.renderStill()
  }

  public setActive(active: boolean): void {
    this.active = active
  }

  public start(): void {
    if (this.running) return
    this.running = true
    if (this.reducedMotion) {
      this.renderStill()
      return
    }
    this.lastFrame = performance.now()
    const loop = (now: number): void => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      const elapsed = now - this.lastFrame
      if (elapsed < FRAME_MS) return
      this.lastFrame = now
      const dt = Math.min(elapsed, 100) / 1000
      // Progress eases slowly; a reset settles in a couple of seconds.
      const rate = this.resetting ? 0.5 : 0.04
      const diff = this.target - this.progress
      this.progress += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
      if (this.resetting && this.progress <= 0.001) this.resetting = false
      this.step(dt)
      this.draw(now)
    }
    this.raf = requestAnimationFrame(loop)
  }

  public stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  public dispose(): void {
    this.stop()
  }

  protected renderStill(): void {
    this.progress = this.target
    this.resetting = false
    if (this.width > 0) this.draw(0)
  }
}
