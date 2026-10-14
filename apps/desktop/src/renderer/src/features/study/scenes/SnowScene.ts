import { SceneBase, drawBokeh, makeCanvas, rand, weighted } from './SceneBase'

/**
 * Snow: a winter street at night seen out of focus, warm windows and street lamps blurred
 * into soft discs, with snow falling past the glass. Flakes near the glass are large and
 * soft; far ones are fine points. As a block runs, a pale frost gathers at the window's
 * edges; a break clears it.
 */

interface Flake {
  x: number
  y: number
  r: number
  depth: number
  phase: number
}

export class SnowScene extends SceneBase {
  private view: HTMLCanvasElement | null = null
  private frost: HTMLCanvasElement | null = null
  private flakes: Flake[] = []

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
    v.filter = `blur(${Math.max(6, w / 120)}px)`
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

    this.flakes = []
    const count = Math.round(Math.min(320, w / 3.6))
    for (let i = 0; i < count; i++) this.flakes.push(this.newFlake(rand(0, h)))
  }

  private newFlake(y = -10): Flake {
    // Most flakes are far away; a few drift right past the glass.
    const depth = Math.pow(Math.random(), 1.8)
    return { x: rand(0, this.width), y, r: 0.5 + depth * 2.2, depth, phase: rand(0, Math.PI * 2) }
  }

  protected step(dt: number): void {
    for (const f of this.flakes) {
      f.y += (10 + f.depth * 34) * dt
      f.phase += dt * (0.4 + f.depth * 0.8)
      f.x += Math.sin(f.phase) * (0.15 + f.depth * 0.45) + 4 * dt
      if (f.y > this.height + 8) Object.assign(f, this.newFlake())
      if (f.x > this.width + 8) f.x = -8
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.view) return
    ctx.drawImage(this.view, 0, 0)
    for (const f of this.flakes) {
      if (f.depth > 0.8) {
        const r = f.r * 2.6
        const soft = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
        soft.addColorStop(0, 'rgba(236, 241, 250, 0.32)')
        soft.addColorStop(1, 'rgba(236, 241, 250, 0)')
        ctx.fillStyle = soft
        ctx.beginPath()
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.globalAlpha = 0.25 + f.depth * 0.55
        ctx.fillStyle = '#e8eef8'
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    if (this.frost) {
      ctx.globalAlpha = 0.25 + 0.75 * this.progress
      ctx.drawImage(this.frost, 0, 0)
      ctx.globalAlpha = 1
    }
  }
}
