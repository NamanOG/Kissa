import { SceneBase, drawBokeh, makeCanvas, rand, weighted } from './SceneBase'

/**
 * Night: a clear sky over a sleeping town. The town is far below and out of focus, a few
 * warm lights; the sky is deep and plain. Stars come out as a block runs, a few at a
 * time, the way they do as your eyes adjust; a break leaves only the brightest.
 */

interface Star {
  x: number
  y: number
  r: number
  /** Progress at which it appears. */
  threshold: number
  phase: number
  speed: number
  tint: string
}

export class NightScene extends SceneBase {
  private backdrop: HTMLCanvasElement | null = null
  private stars: Star[] = []

  protected build(): void {
    const { width: w, height: h } = this
    const scene = makeCanvas(w, h)
    const g = scene.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#04060c')
    sky.addColorStop(0.55, '#0a1020')
    sky.addColorStop(0.82, '#151a2c')
    sky.addColorStop(1, '#1f1f2a')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)

    // Light pollution low on the horizon, and the town itself out of focus.
    const glow = g.createLinearGradient(0, h * 0.6, 0, h)
    glow.addColorStop(0, 'rgba(255, 170, 110, 0)')
    glow.addColorStop(1, 'rgba(255, 170, 110, 0.1)')
    g.fillStyle = glow
    g.fillRect(0, h * 0.6, w, h * 0.4)
    drawBokeh(g, Math.round(w / 22), () => ({
      x: rand(-w * 0.03, w * 1.03),
      y: rand(h * 0.84, h * 1.02),
      r: rand(w * 0.006, w * 0.02),
      rgb: weighted([
        ['255, 186, 120', 6],
        ['255, 222, 170', 3],
        ['200, 215, 255', 1]
      ]),
      alpha: rand(0.12, 0.3)
    }))

    this.backdrop = makeCanvas(w, h)
    const b = this.backdrop.getContext('2d')!
    b.filter = `blur(${Math.max(3, w / 260)}px)`
    b.drawImage(scene, 0, 0)

    this.stars = []
    const count = Math.round(Math.min(520, (w * h) / 2200))
    for (let i = 0; i < count; i++) {
      // Brightness follows a steep curve: many faint stars, very few bright ones.
      const mag = Math.pow(Math.random(), 3)
      this.stars.push({
        x: rand(0, w),
        y: Math.pow(Math.random(), 1.3) * h * 0.78,
        r: 0.35 + mag * 1.3,
        threshold: mag > 0.5 ? 0 : 1 - mag * 2,
        phase: rand(0, 6.3),
        speed: rand(0.3, 1.2),
        tint: weighted([
          ['235, 240, 255', 6],
          ['255, 236, 215', 2],
          ['205, 220, 255', 2]
        ])
      })
    }
  }

  protected step(dt: number): void {
    for (const s of this.stars) s.phase += dt * s.speed
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.backdrop) return
    ctx.drawImage(this.backdrop, 0, 0)
    const shown = 0.1 + 0.9 * this.progress
    for (const s of this.stars) {
      if (s.threshold > shown) continue
      const fadeIn = Math.min(1, (shown - s.threshold) / 0.08)
      const twinkle = this.reducedMotion ? 0.9 : 0.8 + 0.2 * Math.sin(s.phase)
      ctx.fillStyle = `rgba(${s.tint}, ${Math.min(1, (0.35 + s.r * 0.45) * fadeIn * twinkle)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
