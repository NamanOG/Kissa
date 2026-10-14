import { SceneBase, drawBokeh, makeCanvas, rand, weighted } from './SceneBase'
import { SnowLayer, Wind } from './weather'

/**
 * Snow: a winter street at night seen out of focus, warm windows and street lamps blurred
 * into soft discs, with snow falling past the glass. Flakes near the glass are large and
 * soft; far ones are fine points. As a block runs, a pale frost gathers at the window's
 * edges; a break clears it.
 */

export class SnowScene extends SceneBase {
  private view: HTMLCanvasElement | null = null
  private frost: HTMLCanvasElement | null = null
  private snow: SnowLayer | null = null
  private readonly wind = new Wind()

  protected build(): void {
    const { width: w, height: h } = this
    const scene = makeCanvas(w, h)
    const g = scene.getContext('2d')!

    // Night sky over snow: dark at the top, a pale cold glow where snow lies under lamps.
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0b1019')
    sky.addColorStop(0.5, '#151d2a')
    sky.addColorStop(0.78, '#262c38')
    sky.addColorStop(1, '#2f3038')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)

    const horizon = h * 0.6
    drawBokeh(g, Math.round(w / 14), () => {
      const near = Math.random() > 0.7
      return {
        x: rand(-w * 0.05, w * 1.05),
        y: horizon + rand(-h * 0.14, h * 0.12),
        r: near ? rand(w * 0.03, w * 0.06) : rand(w * 0.01, w * 0.028),
        rgb: weighted([
          ['255, 184, 110', 5],
          ['255, 214, 160', 3],
          ['205, 220, 245', 2]
        ]),
        alpha: near ? rand(0.08, 0.16) : rand(0.14, 0.32)
      }
    })
    // Lamp light falling on snow, a broad pale band.
    const ground = g.createLinearGradient(0, horizon, 0, h)
    ground.addColorStop(0, 'rgba(200, 210, 230, 0.06)')
    ground.addColorStop(1, 'rgba(200, 210, 230, 0.02)')
    g.fillStyle = ground
    g.fillRect(0, horizon, w, h - horizon)

    this.view = makeCanvas(w, h)
    const v = this.view.getContext('2d')!
    v.filter = `blur(${Math.max(3, w / 260)}px)`
    v.drawImage(scene, 0, 0)

    // Frost: a soft pale haze at the edges of the glass, no drawn crystals.
    this.frost = makeCanvas(w, h)
    const f = this.frost.getContext('2d')!
    const haze = f.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.55)
    haze.addColorStop(0, 'rgba(215, 225, 240, 0)')
    haze.addColorStop(0.7, 'rgba(215, 225, 240, 0.08)')
    haze.addColorStop(1, 'rgba(215, 225, 240, 0.26)')
    f.fillStyle = haze
    f.fillRect(0, 0, w, h)

    this.snow = new SnowLayer(w, h, 0.55)
  }

  protected step(dt: number): void {
    this.wind.step(dt)
    this.snow?.step(dt, this.wind.value * 0.6)
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.view) return
    if (!this.drawPhoto(ctx)) ctx.drawImage(this.view, 0, 0)
    this.snow?.draw(ctx)
    if (this.frost) {
      ctx.globalAlpha = 0.25 + 0.75 * this.progress
      ctx.drawImage(this.frost, 0, 0)
      ctx.globalAlpha = 1
    }
  }
}
