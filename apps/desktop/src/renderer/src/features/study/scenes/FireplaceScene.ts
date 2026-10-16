import { SceneBase, lerp, makeCanvas, rand } from './SceneBase'

/**
 * Fireplace: a cabin at night, the fire burning in a stone hearth. The photograph's own
 * flames move: they sway and lick upward, the air above them shimmers with heat, their
 * brightness surges and falls the way a real fire breathes (never on a beat), the
 * firelight on the walls and floor rises and dims with them, the embers under the logs
 * pulse, and now and then a spark lifts off and climbs the chimney. Through a block the
 * fire takes hold and the room grows warmer; a break lets it settle back.
 */

/** The fire in the photograph, in fractions of its width and height (measured). */
const FIRE = { u: 0.514, v: 0.51 }
/** The region that moves: the flames and the air above them, inside the firebox. */
const FLAME_BOX = { u0: 0.445, u1: 0.57, v0: 0.265, v1: 0.61 }
/** Where the logs sit (the flames' base), as a fraction of the box height. */
const BASE = 0.86
/** The embers glowing under the grate. */
const EMBERS = { u: 0.514, v: 0.598, ru: 0.075, rv: 0.025 }
const PHOTO_ZOOM = 1.04
/** Rows the moving region is cut into (more is smoother, each is one drawImage). */
const ROWS = 72

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  age: number
  size: number
}

export class FireplaceScene extends SceneBase {
  private glow: HTMLCanvasElement | null = null
  /** The flame region cut from the photograph at its own resolution. */
  private flames: HTMLCanvasElement | null = null
  /** Only the bright flame pixels of that region, for the surging light. */
  private flameLight: HTMLCanvasElement | null = null
  /** Feathered edge so the moving region melts into the still photograph. */
  private feather: HTMLCanvasElement | null = null
  private work: HTMLCanvasElement | null = null
  private sparks: Spark[] = []
  private nextSpark = 0
  /** Random phases so two sessions never burn alike. */
  private readonly phases = Array.from({ length: 8 }, () => rand(0, 6.28))

  protected build(): void {
    const { width: w, height: h } = this
    // Firelight: a warm pool around the hearth, reaching across the floor and walls.
    const r = Math.hypot(w, h) * 0.55
    this.glow = makeCanvas(w, h)
    const g = this.glow.getContext('2d')!
    const light = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r)
    light.addColorStop(0, 'rgba(255, 150, 60, 0.55)')
    light.addColorStop(0.25, 'rgba(255, 120, 40, 0.22)')
    light.addColorStop(0.6, 'rgba(200, 80, 20, 0.06)')
    light.addColorStop(1, 'rgba(200, 80, 20, 0)')
    g.fillStyle = light
    g.fillRect(0, 0, w, h)
    this.sparks = []
    if (this.photo) this.cutFlames()
  }

  protected onPhoto(): void {
    this.cutFlames()
  }

  /** Cuts the flame region out of the photograph once, at the photograph's own resolution. */
  private cutFlames(): void {
    const img = this.photo
    if (!img) return
    const sx = Math.round(img.naturalWidth * FLAME_BOX.u0)
    const sy = Math.round(img.naturalHeight * FLAME_BOX.v0)
    const sw = Math.round(img.naturalWidth * (FLAME_BOX.u1 - FLAME_BOX.u0))
    const sh = Math.round(img.naturalHeight * (FLAME_BOX.v1 - FLAME_BOX.v0))

    this.flames = makeCanvas(sw, sh)
    const f = this.flames.getContext('2d', { willReadFrequently: true })!
    f.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    // The flame light: keep only bright, warm pixels, fading in smoothly.
    this.flameLight = makeCanvas(sw, sh)
    const l = this.flameLight.getContext('2d')!
    try {
      const data = f.getImageData(0, 0, sw, sh)
      const px = data.data
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.6 * px[i] + 0.35 * px[i + 1] + 0.05 * px[i + 2]
        const k = Math.min(1, Math.max(0, (lum - 120) / 110))
        px[i + 3] = Math.round(k * k * 255)
      }
      l.putImageData(data, 0, 0)
    } catch {
      // Pixels unreadable (should not happen for a bundled photo): no extra flame light.
      this.flameLight = null
    }

    // An oval with a soft edge: the moving copy fully covers the still flames in the middle
    // and blends into the bricks at the sides and top.
    this.feather = makeCanvas(sw, sh)
    const m = this.feather.getContext('2d')!
    m.save()
    m.translate(sw / 2, sh * 0.55)
    m.scale(sw / 2, sh * 0.55)
    const oval = m.createRadialGradient(0, 0, 0, 0, 0, 1)
    oval.addColorStop(0, 'rgba(0,0,0,1)')
    oval.addColorStop(0.62, 'rgba(0,0,0,1)')
    oval.addColorStop(1, 'rgba(0,0,0,0)')
    m.fillStyle = oval
    m.fillRect(-1, -1, 2, 2)
    m.restore()

    this.work = makeCanvas(sw, sh)
  }

  /** Where the photograph is on screen right now (it drifts very slowly). */
  private photoRect(): { x: number; y: number; w: number; h: number } | null {
    const img = this.photo
    if (!img) return null
    const { width: w, height: h } = this
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * PHOTO_ZOOM
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const driftX = this.reducedMotion ? 0 : Math.sin(this.time * 0.02) * (dw - w) * 0.35
    const driftY = this.reducedMotion ? 0 : Math.cos(this.time * 0.015) * (dh - h) * 0.25
    return { x: (w - dw) / 2 + driftX, y: (h - dh) / 2 + driftY, w: dw, h: dh }
  }

  /** 0..1, a slow irregular breathing with a quicker shimmer on top. */
  private flicker(offset = 0): number {
    if (this.reducedMotion) return 0.6
    const t = this.time + offset
    const [a, b, c, d] = this.phases
    const slow = Math.sin(t * 0.9 + a) * 0.5 + Math.sin(t * 1.7 + b) * 0.3
    const quick = Math.sin(t * 6.3 + c) * 0.12 + Math.sin(t * 11.1 + d) * 0.08
    return Math.min(1, Math.max(0, 0.55 + (slow + quick) * 0.45))
  }

  protected step(dt: number): void {
    if (this.reducedMotion) return
    // A spark every few seconds, more often once the fire has taken hold.
    this.nextSpark -= dt
    if (this.nextSpark <= 0) {
      this.nextSpark = rand(1.0, 3.8) * lerp(1.4, 0.7, this.progress)
      const burst = Math.random() < 0.25 ? 3 : 1
      for (let i = 0; i < burst; i++) {
        this.sparks.push({
          x: rand(-16, 16),
          y: rand(-10, 0),
          vx: rand(-6, 6),
          vy: -rand(28, 64),
          life: rand(0.8, 2.2),
          age: 0,
          size: rand(0.8, 1.8)
        })
      }
    }
    for (const s of this.sparks) {
      s.age += dt
      s.vx += rand(-14, 14) * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life)
  }

  /**
   * The photograph's flames, moving: each row of the flame region is shifted sideways by
   * a few layered waves that grow towards the tips (flames sway more at the top than at
   * the logs) and sampled a little lower or higher in turn, so the tongues stretch and
   * fall back. The bricks above shimmer the same way, as air does over a fire.
   */
  private drawFlames(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, f: number): void {
    const src = this.flames
    const work = this.work
    const feather = this.feather
    if (!src || !work || !feather) return
    const sw = src.width
    const sh = src.height
    const w = work.getContext('2d')!
    w.clearRect(0, 0, sw, sh)
    const t = this.time
    const [, , , , e, g2, k, m] = this.phases
    const rowH = sh / ROWS
    for (let i = 0; i < ROWS; i++) {
      const y = i * rowH
      const v = y / sh
      // 0 at the logs, 1 at the top of the box.
      const height = Math.max(0, (BASE - v) / BASE)
      const sway =
        (Math.sin(t * 2.3 + v * 9 + e) * 0.55 + Math.sin(t * 5.1 - v * 15 + g2) * 0.3 + Math.sin(t * 9.7 + v * 23 + k) * 0.15) *
        sw *
        0.022 *
        Math.pow(height, 1.3)
      // Tongues licking upward: sample from a little below, more so at the tips, in surges.
      const lick = (Math.sin(t * 3.4 - v * 11 + m) * 0.5 + 0.5) * sh * 0.035 * height * (0.6 + f * 0.6)
      const sy = Math.min(sh - rowH, Math.max(0, y + lick))
      w.drawImage(src, 0, sy, sw, rowH + 0.5, sway, y, sw, rowH + 0.5)
    }
    w.globalCompositeOperation = 'destination-in'
    w.drawImage(feather, 0, 0)
    w.globalCompositeOperation = 'source-over'

    const x = rect.x + rect.w * FLAME_BOX.u0
    const y = rect.y + rect.h * FLAME_BOX.v0
    const dw = rect.w * (FLAME_BOX.u1 - FLAME_BOX.u0)
    const dh = rect.h * (FLAME_BOX.v1 - FLAME_BOX.v0)
    ctx.drawImage(work, x, y, dw, dh)

    // The flames surge and fall: their own light, added back brighter or softer, and a
    // touch taller when it surges.
    if (this.flameLight) {
      const surge = this.flicker(0.37)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.12 + surge * 0.42
      const stretch = 1 + surge * 0.07
      const base = y + dh * BASE
      ctx.drawImage(this.flameLight, x, base - dh * BASE * stretch, dw, dh * stretch)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    const { width: w, height: h } = this
    if (!this.drawPhoto(ctx, PHOTO_ZOOM)) {
      ctx.fillStyle = '#120b07'
      ctx.fillRect(0, 0, w, h)
      return
    }
    const rect = this.photoRect()!
    const p = this.progress
    const f = this.flicker()
    const fireX = rect.x + rect.w * FIRE.u
    const fireY = rect.y + rect.h * FIRE.v

    if (!this.reducedMotion) this.drawFlames(ctx, rect, f)

    // The embers under the grate pulse on their own slower breath.
    const ember = this.flicker(2.1)
    const ex = rect.x + rect.w * EMBERS.u
    const ey = rect.y + rect.h * EMBERS.v
    ctx.save()
    ctx.translate(ex, ey)
    ctx.scale(rect.w * EMBERS.ru, rect.h * EMBERS.rv)
    const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    eg.addColorStop(0, `rgba(255, 110, 30, ${0.16 + ember * 0.22})`)
    eg.addColorStop(1, 'rgba(255, 80, 20, 0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = eg
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'

    // The room dims and brightens with the fire: the walls and floor follow the flames.
    ctx.fillStyle = `rgba(8, 4, 2, ${lerp(0.24, 0.1, p) + (1 - f) * 0.12})`
    ctx.fillRect(0, 0, w, h)

    if (this.glow) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (0.08 + f * 0.24) * lerp(0.65, 1, p)
      ctx.drawImage(this.glow, fireX - w / 2, fireY - h / 2)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    // Sparks lift from the logs and fade as they climb.
    const unit = (rect.w / 1536) * 1.3
    const sparkY = rect.y + rect.h * (FLAME_BOX.v0 + (FLAME_BOX.v1 - FLAME_BOX.v0) * 0.62)
    for (const s of this.sparks) {
      const k = s.age / s.life
      const alpha = Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k) * 0.9
      ctx.fillStyle = `rgba(255, ${Math.round(lerp(210, 120, k))}, 70, ${alpha})`
      ctx.beginPath()
      ctx.arc(fireX + s.x * unit, sparkY + s.y * unit, s.size * unit, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
