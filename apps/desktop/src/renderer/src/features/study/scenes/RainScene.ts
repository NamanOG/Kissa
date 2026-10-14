import { SceneBase, makeCanvas, rand } from './SceneBase'
import { RainLayer, Wind } from './weather'

/**
 * Rain: a dusk street through rain-streaked glass. The glass mists over as a block runs;
 * running drops wipe lines through the mist; a break clears it.
 *
 * Drops are tiny lenses: each shows a wider patch of the street, upside down.
 */

interface Drop {
  x: number
  y: number
  r: number
}

interface Runner extends Drop {
  speed: number
  stillFor: number
  lastTrailY: number
}

export class RainScene extends SceneBase {
  private viewBlurred: HTMLCanvasElement | null = null
  private viewSharp: HTMLCanvasElement | null = null
  private glass: HTMLCanvasElement | null = null
  private glassCtx: CanvasRenderingContext2D | null = null
  private mistCanvas: HTMLCanvasElement | null = null
  private mistCtx: CanvasRenderingContext2D | null = null
  private resting: Drop[] = []
  private runners: Runner[] = []
  private rain: RainLayer | null = null
  private readonly wind = new Wind()
  private glassDirty = true
  /** Fine condensation-sized droplets, drawn once. */
  private micro: HTMLCanvasElement | null = null

  protected build(): void {
    const { width: w, height: h } = this
    const scene = makeCanvas(w, h)
    const g = scene.getContext('2d')!

    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0d1420')
    sky.addColorStop(0.45, '#1c2633')
    sky.addColorStop(0.72, '#2b2a2c')
    sky.addColorStop(1, '#3a2b20')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)

    const horizon = h * 0.62
    let x = -w * 0.05
    while (x < w * 1.05) {
      const bw = rand(w * 0.08, w * 0.2)
      const bh = rand(h * 0.18, h * 0.5)
      g.fillStyle = `rgb(${rand(14, 26) | 0}, ${rand(18, 30) | 0}, ${rand(26, 38) | 0})`
      g.fillRect(x, horizon - bh, bw, bh + h)
      const cols = Math.max(2, Math.round(bw / (w * 0.018)))
      const rows = Math.max(2, Math.round(bh / (h * 0.05)))
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() > 0.22) continue
          const warm = Math.random() > 0.25
          g.fillStyle = warm
            ? `rgba(255, ${rand(170, 210) | 0}, ${rand(100, 140) | 0}, ${rand(0.5, 0.9)})`
            : `rgba(${rand(150, 190) | 0}, ${rand(190, 220) | 0}, 255, ${rand(0.3, 0.6)})`
          g.fillRect(x + (c + 0.3) * (bw / cols), horizon - bh + (r + 0.3) * (bh / rows), (bw / cols) * 0.45, (bh / rows) * 0.4)
        }
      }
      x += bw + rand(w * 0.005, w * 0.03)
    }

    // City lights out of focus: lens bokeh, soft-edged discs that brighten where they
    // overlap. Sodium amber and warm windows mostly, a few cool whites, tail lights and a
    // traffic green, denser near the street.
    const palette: Array<[string, number]> = [
      ['255, 176, 92', 0.34],
      ['255, 206, 140', 0.22],
      ['214, 228, 255', 0.16],
      ['255, 92, 72', 0.12],
      ['120, 220, 170', 0.05],
      ['255, 236, 200', 0.11]
    ]
    const pick = (): string => {
      let roll = Math.random()
      for (const [rgb, weight] of palette) {
        if ((roll -= weight) <= 0) return rgb
      }
      return palette[0][0]
    }
    g.globalCompositeOperation = 'lighter'
    const discs = Math.round(w / 9)
    for (let i = 0; i < discs; i++) {
      const lx = rand(-w * 0.05, w * 1.05)
      const ly = horizon + (Math.random() - 0.35) * h * 0.38 * Math.random()
      const lr = rand(w * 0.008, w * 0.045) * (ly > horizon ? 1.15 : 0.85)
      const rgb = pick()
      const alpha = rand(0.1, 0.3)
      const disc = g.createRadialGradient(lx, ly, 0, lx, ly, lr)
      disc.addColorStop(0, `rgba(${rgb}, ${alpha * 0.85})`)
      disc.addColorStop(0.78, `rgba(${rgb}, ${alpha})`)
      disc.addColorStop(0.9, `rgba(${rgb}, ${alpha * 0.55})`)
      disc.addColorStop(1, `rgba(${rgb}, 0)`)
      g.fillStyle = disc
      g.beginPath()
      g.arc(lx, ly, lr, 0, Math.PI * 2)
      g.fill()
      // A faint smear of the light on the wet road below it.
      if (ly < horizon * 1.02 && Math.random() > 0.5) {
        const refl = g.createLinearGradient(0, ly, 0, Math.min(h, ly + h * 0.35))
        refl.addColorStop(0, `rgba(${rgb}, ${alpha * 0.25})`)
        refl.addColorStop(1, `rgba(${rgb}, 0)`)
        g.fillStyle = refl
        g.fillRect(lx - lr * 0.35, ly, lr * 0.7, h * 0.35)
      }
    }
    g.globalCompositeOperation = 'source-over'
    this.viewSharp = makeCanvas(w, h)
    const sharp = this.viewSharp.getContext('2d')!
    sharp.filter = `blur(${Math.max(2, w / 320)}px)`
    sharp.drawImage(scene, 0, 0)

    this.viewBlurred = makeCanvas(w, h)
    const blurred = this.viewBlurred.getContext('2d')!
    blurred.filter = `blur(${Math.max(5, w / 130)}px)`
    blurred.drawImage(scene, 0, 0)
    blurred.filter = 'none'
    blurred.fillStyle = 'rgba(6, 8, 12, 0.3)'
    blurred.fillRect(0, 0, w, h)

    this.glass = makeCanvas(w, h)
    this.glassCtx = this.glass.getContext('2d')
    this.mistCanvas = makeCanvas(w, h)
    this.mistCtx = this.mistCanvas.getContext('2d')
    this.paintMist(1)

    this.micro = makeCanvas(w, h)
    const mc = this.micro.getContext('2d')!
    for (let i = 0; i < Math.round((w * h) / 420); i++) {
      const x = rand(0, w)
      const y = rand(0, h)
      const r = rand(0.35, 1.1)
      mc.fillStyle = 'rgba(0, 0, 0, 0.22)'
      mc.beginPath()
      mc.arc(x, y + r * 0.3, r, 0, Math.PI * 2)
      mc.fill()
      mc.fillStyle = `rgba(235, 240, 250, ${rand(0.12, 0.35)})`
      mc.beginPath()
      mc.arc(x - r * 0.2, y - r * 0.25, r * 0.55, 0, Math.PI * 2)
      mc.fill()
    }

    this.resting = []
    const count = Math.round(Math.min(420, (w * h) / 2600))
    for (let i = 0; i < count; i++) this.resting.push(this.newDrop())
    this.runners = []
    this.rain = new RainLayer(w, h, 0.7)
    this.glassDirty = true
  }

  private newDrop(x = rand(0, this.width), y = rand(0, this.height)): Drop {
    const roll = Math.random()
    return { x, y, r: roll > 0.93 ? rand(3.6, 6) : roll > 0.6 ? rand(1.8, 3.4) : rand(0.8, 1.8) }
  }

  /** Drops and mist show the real street once the photograph is here. */
  protected onPhoto(): void {
    const cover = this.photoCover()
    if (!cover) return
    this.viewSharp = cover
    const blurred = makeCanvas(this.width, this.height)
    const b = blurred.getContext('2d')!
    b.filter = `blur(${Math.max(6, this.width / 90)}px)`
    b.drawImage(cover, 0, 0)
    this.viewBlurred = blurred
    this.paintMist(1)
    this.glassDirty = true
  }

  public reset(): void {
    super.reset()
    // A wipe also clears the lines drawn through the mist.
    this.paintMist(1)
  }

  protected step(dt: number): void {
    const { width: w, height: h } = this
    const intensity = this.active ? 1 : 0.7
    this.wind.step(dt)
    this.rain?.step(dt, this.wind.value * 0.5)

    const landings = dt * intensity * (w / 40)
    for (let i = 0; i < landings; i++) {
      if (Math.random() < landings - i) {
        this.resting.push(this.newDrop())
        this.glassDirty = true
      }
    }
    if (this.resting.length > 520) {
      this.resting.splice(0, this.resting.length - 520)
      this.glassDirty = true
    }

    if (this.runners.length < 9 && Math.random() < dt * 0.9 * intensity) {
      this.runners.push({ x: rand(0, w), y: rand(-10, h * 0.5), r: rand(4.5, 7.5), speed: rand(18, 60), stillFor: rand(0, 1.2), lastTrailY: 0 })
    }

    for (let i = this.runners.length - 1; i >= 0; i--) {
      const d = this.runners[i]
      if (d.stillFor > 0) {
        d.stillFor -= dt
        continue
      }
      d.y += d.speed * dt
      d.x += Math.sin(d.y * 0.05) * 0.15
      if (Math.random() < dt * 0.6) d.stillFor = rand(0.1, 0.7)
      if (Math.random() < dt * 0.8) d.speed = rand(18, 70)
      for (let j = this.resting.length - 1; j >= 0; j--) {
        const r = this.resting[j]
        const dx = r.x - d.x
        const dy = r.y - d.y
        if (dx * dx + dy * dy < (d.r + r.r) * (d.r + r.r)) {
          this.resting.splice(j, 1)
          d.r = Math.min(9, d.r + r.r * 0.08)
          this.glassDirty = true
        }
      }
      if (d.y - d.lastTrailY > rand(6, 16)) {
        d.lastTrailY = d.y
        if (Math.random() > 0.35) this.resting.push({ x: d.x + rand(-1, 1), y: d.y - d.r, r: rand(0.6, 1.3) })
        this.glassDirty = true
      }
      this.clearMistAt(d.x, d.y, d.r * 1.4)
      if (d.y - d.r > h) this.runners.splice(i, 1)
    }

    if (this.progress > 0.05 && Math.random() < dt * 2) this.paintMist(0.04)
  }

  private paintMist(alpha: number): void {
    const m = this.mistCtx
    if (!m || !this.viewBlurred) return
    m.globalCompositeOperation = 'source-over'
    m.globalAlpha = alpha
    m.drawImage(this.viewBlurred, 0, 0)
    const veil = m.createLinearGradient(0, 0, 0, this.height)
    veil.addColorStop(0, 'rgba(190, 200, 210, 0.05)')
    veil.addColorStop(1, 'rgba(210, 205, 200, 0.14)')
    m.fillStyle = veil
    m.fillRect(0, 0, this.width, this.height)
    m.globalAlpha = 1
  }

  private clearMistAt(x: number, y: number, r: number): void {
    const m = this.mistCtx
    if (!m) return
    m.globalCompositeOperation = 'destination-out'
    m.beginPath()
    m.arc(x, y, r, 0, Math.PI * 2)
    m.fill()
    m.globalCompositeOperation = 'source-over'
  }

  private drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const view = this.viewSharp
    if (!view || r < 0.5) return
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.clip()
    const span = r * 6
    ctx.translate(x, y)
    ctx.scale(1, -1)
    ctx.drawImage(view, x - span / 2, y - span / 2, span, span, -r, -r, r * 2, r * 2)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)'
    ctx.lineWidth = Math.max(0.5, r * 0.22)
    ctx.stroke()
    if (r > 1.4) {
      ctx.beginPath()
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fill()
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.viewBlurred) return
    const photo = this.drawPhoto(ctx)
    if (!photo) ctx.drawImage(this.viewBlurred, 0, 0)

    // Rain falling outside, then the glass with its drops in front.
    if (!this.reducedMotion) this.rain?.draw(ctx, this.wind.value * 0.5, photo ? 0.55 : 1)

    // The photograph is an open veranda: no glass, only rain and a mist that thickens a little.
    if (photo) {
      if (this.mistCanvas) {
        ctx.globalAlpha = 0.04 + 0.22 * this.progress
        ctx.drawImage(this.mistCanvas, 0, 0)
        ctx.globalAlpha = 1
      }
      return
    }

    const mist = 0.08 + 0.4 * this.progress
    if (this.mistCanvas) {
      ctx.globalAlpha = mist
      ctx.drawImage(this.mistCanvas, 0, 0)
      ctx.globalAlpha = 1
    }

    if (this.glassDirty && this.glassCtx && this.glass) {
      this.glassCtx.clearRect(0, 0, this.width, this.height)
      for (const d of this.resting) this.drawDrop(this.glassCtx, d.x, d.y, d.r)
      this.glassDirty = false
    }
    if (this.micro) {
      ctx.globalAlpha = 0.5 + 0.5 * (1 - this.progress)
      ctx.drawImage(this.micro, 0, 0)
      ctx.globalAlpha = 1
    }
    if (this.glass) ctx.drawImage(this.glass, 0, 0)
    for (const d of this.runners) this.drawDrop(ctx, d.x, d.y, d.r)
  }
}
