import { SceneBase, makeCanvas, mixHex, rand } from './SceneBase'

/**
 * Misty forest: layered pines in drifting fog. Through a block the light turns from
 * blue pre-dawn to a warm morning and soft rays reach through the trees; a break returns
 * it to first light.
 */

interface FogBand {
  x: number
  y: number
  w: number
  h: number
  speed: number
  alpha: number
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
}

const DAWN = { top: '#18212f', mid: '#2c3a46', low: '#3c4a4c' }
const MORNING = { top: '#6d8193', mid: '#c7b28e', low: '#e2c38f' }

export class ForestScene extends SceneBase {
  private trees: HTMLCanvasElement[] = []
  private fog: FogBand[] = []
  private motes: Mote[] = []

  protected build(): void {
    const { width: w, height: h } = this
    this.trees = []
    // Far to near; each layer is drawn in black and tinted by the light at draw time.
    const layers: Array<[number, number, number]> = [
      [0.55, 0.06, 4],
      [0.66, 0.09, 1.5],
      [0.8, 0.13, 0.8]
    ]
    for (const [base, size, blur] of layers) {
      const c = makeCanvas(w, h)
      const g = c.getContext('2d')!
      if (blur) g.filter = `blur(${blur}px)`
      g.fillStyle = '#000'
      g.fillRect(0, h * base, w, h)
      let x = -w * 0.03
      while (x < w * 1.03) {
        const tw = rand(w * size * 0.3, w * size * 0.55)
        const th = rand(h * size * 2.2, h * size * 3.6)
        // A pine: a tall narrow silhouette with ragged, slightly drooping branch tips.
        const cx = x + tw / 2
        const top = h * base - th
        const steps = 9
        g.beginPath()
        g.moveTo(cx, top)
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          const half = (tw / 2) * t * rand(0.85, 1.05)
          g.lineTo(cx + half, top + th * t - th * 0.03)
          g.lineTo(cx + half * 0.55, top + th * t)
        }
        g.lineTo(cx + tw * 0.04, h * base + 2)
        g.lineTo(cx - tw * 0.04, h * base + 2)
        for (let s = steps; s >= 1; s--) {
          const t = s / steps
          const half = (tw / 2) * t * rand(0.85, 1.05)
          g.lineTo(cx - half * 0.55, top + th * t)
          g.lineTo(cx - half, top + th * t - th * 0.03)
        }
        g.closePath()
        g.fill()
        x += tw * rand(0.4, 1.1)
      }
      this.trees.push(c)
    }

    this.fog = []
    for (let i = 0; i < 9; i++) {
      this.fog.push({
        x: rand(-w * 0.3, w),
        y: rand(h * 0.45, h * 0.95),
        w: rand(w * 0.4, w * 0.9),
        h: rand(h * 0.08, h * 0.2),
        speed: rand(4, 12) * (Math.random() > 0.5 ? 1 : -1),
        alpha: rand(0.18, 0.4)
      })
    }
    this.motes = []
    for (let i = 0; i < 46; i++) {
      this.motes.push({ x: rand(0, w), y: rand(0, h), vx: rand(-4, 4), vy: rand(-3, 1), r: rand(0.6, 1.6), phase: rand(0, 6) })
    }
  }

  protected step(dt: number): void {
    const { width: w, height: h } = this
    for (const f of this.fog) {
      f.x += f.speed * dt
      if (f.x > w) f.x = -f.w
      if (f.x + f.w < 0) f.x = w
    }
    for (const m of this.motes) {
      m.phase += dt
      m.x += (m.vx + Math.sin(m.phase) * 3) * dt
      m.y += m.vy * dt
      if (m.y < -4) m.y = h + 4
      if (m.x < -4) m.x = w + 4
      if (m.x > w + 4) m.x = -4
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    const { width: w, height: h } = this
    const p = this.progress
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, mixHex(DAWN.top, MORNING.top, p))
    sky.addColorStop(0.55, mixHex(DAWN.mid, MORNING.mid, p))
    sky.addColorStop(1, mixHex(DAWN.low, MORNING.low, p))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // The sun's glow rises behind the trees.
    const sunY = h * (0.62 - 0.18 * p)
    const sun = ctx.createRadialGradient(w * 0.72, sunY, 0, w * 0.72, sunY, w * 0.45)
    sun.addColorStop(0, `rgba(255, 220, 160, ${0.08 + 0.45 * p})`)
    sun.addColorStop(1, 'rgba(255, 220, 160, 0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h)

    const layerTint = [0.55, 0.75, 0.92]
    this.trees.forEach((layer, i) => {
      // Far layers sit lighter in the haze; everything lightens a little with the day.
      ctx.globalAlpha = layerTint[i] - p * 0.12
      ctx.drawImage(layer, 0, 0)
      ctx.globalAlpha = 1
      const fogBand = this.fog.filter((_, j) => j % 3 === i)
      for (const f of fogBand) {
        const grad = ctx.createRadialGradient(f.x + f.w / 2, f.y, 0, f.x + f.w / 2, f.y, f.w / 2)
        const tone = p > 0.5 ? '255, 240, 220' : '200, 214, 226'
        grad.addColorStop(0, `rgba(${tone}, ${f.alpha})`)
        grad.addColorStop(1, `rgba(${tone}, 0)`)
        ctx.fillStyle = grad
        ctx.save()
        ctx.translate(0, f.y)
        ctx.scale(1, f.h / f.w)
        ctx.translate(0, -f.y)
        ctx.fillRect(f.x, f.y - f.w / 2, f.w, f.w)
        ctx.restore()
      }
    })

    // Rays once the morning is up.
    if (p > 0.35) {
      const strength = (p - 0.35) / 0.65
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) {
        const x0 = w * (0.55 + i * 0.07)
        const ray = ctx.createLinearGradient(x0, 0, x0 - w * 0.25, h)
        ray.addColorStop(0, `rgba(255, 225, 170, ${0.06 * strength})`)
        ray.addColorStop(1, 'rgba(255, 225, 170, 0)')
        ctx.fillStyle = ray
        ctx.beginPath()
        ctx.moveTo(x0, 0)
        ctx.lineTo(x0 + w * 0.03, 0)
        ctx.lineTo(x0 - w * 0.2, h)
        ctx.lineTo(x0 - w * 0.28, h)
        ctx.fill()
      }
      ctx.restore()
    }

    if (!this.reducedMotion) {
      ctx.fillStyle = `rgba(255, 236, 200, ${0.25 + 0.4 * p})`
      for (const m of this.motes) {
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
