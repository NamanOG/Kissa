import { SceneBase, lerp, makeCanvas, rand } from './SceneBase'

/**
 * Fireplace: a cabin at night, the fire low in a stone hearth. The firelight breathes the
 * way a real fire does, never on a beat, and now and then a spark lifts off the logs and
 * climbs the chimney. Through a block the fire takes hold and the room grows warmer; a
 * break lets it settle back.
 */

/** Where the fire sits in the photograph (fractions of its width and height). */
const FIRE_U = 0.5
const FIRE_V = 0.5
const PHOTO_ZOOM = 1.04

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
  private sparks: Spark[] = []
  private nextSpark = 0
  /** Random phases so two sessions never flicker alike. */
  private readonly phases = [rand(0, 6.28), rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)]

  protected build(): void {
    const { width: w, height: h } = this
    // Firelight: a warm pool around the hearth, reaching across the floor.
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
  }

  /** The fire's position on screen, following the photograph's slow drift. */
  private firePoint(): { x: number; y: number; scale: number } {
    const { width: w, height: h } = this
    const img = this.photo
    if (!img) return { x: w * FIRE_U, y: h * FIRE_V, scale: 1 }
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * PHOTO_ZOOM
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const driftX = this.reducedMotion ? 0 : Math.sin(this.time * 0.02) * (dw - w) * 0.35
    const driftY = this.reducedMotion ? 0 : Math.cos(this.time * 0.015) * (dh - h) * 0.25
    return { x: (w - dw) / 2 + driftX + dw * FIRE_U, y: (h - dh) / 2 + driftY + dh * FIRE_V, scale }
  }

  /** 0..1, a slow irregular breathing with a quicker shimmer on top. */
  private flicker(): number {
    if (this.reducedMotion) return 0.6
    const t = this.time
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
      this.nextSpark = rand(1.2, 4.5) * lerp(1.4, 0.7, this.progress)
      const burst = Math.random() < 0.25 ? 3 : 1
      for (let i = 0; i < burst; i++) {
        this.sparks.push({
          x: rand(-16, 16),
          y: 0,
          vx: rand(-6, 6),
          vy: -rand(28, 60),
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

  protected draw(): void {
    const ctx = this.ctx
    const { width: w, height: h } = this
    if (!this.drawPhoto(ctx, PHOTO_ZOOM)) {
      ctx.fillStyle = '#120b07'
      ctx.fillRect(0, 0, w, h)
    }
    const p = this.progress
    const f = this.flicker()
    const fire = this.firePoint()

    // The room dims and brightens a little with the fire.
    ctx.fillStyle = `rgba(8, 4, 2, ${lerp(0.22, 0.08, p) + (1 - f) * 0.07})`
    ctx.fillRect(0, 0, w, h)

    if (this.glow) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = (0.1 + f * 0.16) * lerp(0.65, 1, p)
      ctx.drawImage(this.glow, fire.x - w / 2, fire.y - h / 2)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    // Sparks lift from the logs (the fire's centre in the photograph) and fade as they climb.
    const unit = (w / 1536) * 1.4
    for (const s of this.sparks) {
      const k = s.age / s.life
      const alpha = Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k) * 0.9
      ctx.fillStyle = `rgba(255, ${Math.round(lerp(200, 120, k))}, 70, ${alpha})`
      ctx.beginPath()
      ctx.arc(fire.x + s.x * unit, fire.y + s.y * unit, s.size * unit, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
