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
  /** A photograph to show behind the weather. */
  setPhoto(url: string | undefined): void
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

/**
 * Out-of-focus light, as a camera lens renders it: soft-edged discs that brighten where
 * they overlap. Everything in the Study Room's views is defocused like this, the way a
 * window looks when your eyes are on the desk, so no scene shows invented detail.
 */
export function drawBokeh(
  g: CanvasRenderingContext2D,
  count: number,
  place: () => { x: number; y: number; r: number; rgb: string; alpha: number }
): void {
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < count; i++) {
    const { x, y, r, rgb, alpha } = place()
    const disc = g.createRadialGradient(x, y, 0, x, y, r)
    disc.addColorStop(0, `rgba(${rgb}, ${alpha * 0.8})`)
    disc.addColorStop(0.8, `rgba(${rgb}, ${alpha})`)
    disc.addColorStop(0.92, `rgba(${rgb}, ${alpha * 0.45})`)
    disc.addColorStop(1, `rgba(${rgb}, 0)`)
    g.fillStyle = disc
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/** Picks from weighted choices. */
export function weighted<T>(choices: Array<[T, number]>): T {
  let roll = Math.random() * choices.reduce((s, [, w]) => s + w, 0)
  for (const [value, weight] of choices) {
    if ((roll -= weight) <= 0) return value
  }
  return choices[0][0]
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
  /** Seconds since the scene started, for slow drifts and sways. */
  protected time = 0
  /** A photograph behind the weather, when the environment has one. */
  protected photo: HTMLImageElement | null = null
  private raf = 0
  private timer = 0
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

  /** Loads the environment's photograph; until it arrives the scene draws its own backdrop. */
  public setPhoto(url: string | undefined): void {
    if (!url) return
    const img = new Image()
    img.decoding = 'async'
    img.onload = (): void => {
      this.photo = img
      if (this.width > 0) {
        this.onPhoto()
        this.draw(performance.now())
      }
    }
    img.src = url
  }

  /**
   * Draws the photograph to cover the view, drifting very slowly (a few pixels a minute),
   * the way a still view looks alive when you are not quite looking at it.
   */
  protected drawPhoto(ctx: CanvasRenderingContext2D, zoom = 1.06): boolean {
    const img = this.photo
    if (!img) return false
    const { width: w, height: h } = this
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const driftX = this.reducedMotion ? 0 : Math.sin(this.time * 0.02) * (dw - w) * 0.35
    const driftY = this.reducedMotion ? 0 : Math.cos(this.time * 0.015) * (dh - h) * 0.25
    ctx.drawImage(img, (w - dw) / 2 + driftX, (h - dh) / 2 + driftY, dw, dh)
    return true
  }

  /** Called when the photograph arrives (and after each resize once it has). */
  protected onPhoto(): void {}

  /** The photograph scaled to cover the view, without drift: for effects that sample it. */
  protected photoCover(): HTMLCanvasElement | null {
    const img = this.photo
    if (!img || this.width === 0) return null
    const c = document.createElement('canvas')
    c.width = this.width
    c.height = this.height
    const g = c.getContext('2d')!
    const scale = Math.max(this.width / img.naturalWidth, this.height / img.naturalHeight) * 1.06
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    g.drawImage(img, (this.width - dw) / 2, (this.height - dh) / 2, dw, dh)
    return c
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
    if (this.photo) this.onPhoto()
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
    // Sleep between frames instead of skipping animation frames: a skipped frame still wakes
    // the page at the display's rate (120 times a second on many laptops).
    const next = (): void => {
      const wait = Math.max(0, FRAME_MS - (performance.now() - this.lastFrame) - 4)
      this.timer = window.setTimeout(() => {
        if (this.running) this.raf = requestAnimationFrame(loop)
      }, wait)
    }
    const loop = (now: number): void => {
      if (!this.running) return
      const elapsed = now - this.lastFrame
      if (elapsed < FRAME_MS - 6) {
        next()
        return
      }
      this.lastFrame = now
      next()
      const dt = Math.min(elapsed, 100) / 1000
      // Progress eases slowly; a reset settles in a couple of seconds.
      const rate = this.resetting ? 0.5 : 0.04
      const diff = this.target - this.progress
      this.progress += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt)
      if (this.resetting && this.progress <= 0.001) this.resetting = false
      this.time += dt
      this.step(dt)
      this.draw(now)
    }
    this.raf = requestAnimationFrame(loop)
  }

  public stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.timer)
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

