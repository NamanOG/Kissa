import { SceneBase, makeCanvas, rand } from './SceneBase'

/**
 * Snow: a winter night over a pine valley with a few cabin lights, snow falling in three
 * depths. Frost creeps in from the window's edges as a block runs; a break warms the glass
 * clear again.
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
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0a1020')
    sky.addColorStop(0.55, '#1a2438')
    sky.addColorStop(1, '#2a3346')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)

    // Three ridges of pines, nearer ones darker and larger.
    const ridges: Array<[number, string, number]> = [
      [0.58, '#1c2638', 0.05],
      [0.68, '#141c2b', 0.07],
      [0.8, '#0c121d', 0.1]
    ]
    for (const [base, colour, size] of ridges) {
      g.fillStyle = colour
      g.fillRect(0, h * base, w, h)
      let x = -w * 0.02
      while (x < w * 1.02) {
        const tw = rand(w * size * 0.35, w * size * 0.6)
        const th = rand(h * size * 1.4, h * size * 2.6)
        g.beginPath()
        g.moveTo(x, h * base + 2)
        g.lineTo(x + tw / 2, h * base - th)
        g.lineTo(x + tw, h * base + 2)
        g.fill()
        x += tw * rand(0.45, 0.9)
      }
      // Snow lying on the ridge.
      g.fillStyle = 'rgba(210, 222, 240, 0.08)'
      g.fillRect(0, h * base, w, h * 0.012)
    }

    // Cabin windows in the valley.
    for (let i = 0; i < 7; i++) {
      const cx = rand(w * 0.05, w * 0.95)
      const cy = rand(h * 0.6, h * 0.76)
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.03)
      glow.addColorStop(0, 'rgba(255, 190, 120, 0.9)')
      glow.addColorStop(0.3, 'rgba(255, 170, 90, 0.25)')
      glow.addColorStop(1, 'rgba(255, 170, 90, 0)')
      g.fillStyle = glow
      g.fillRect(cx - w * 0.03, cy - w * 0.03, w * 0.06, w * 0.06)
    }

    this.view = makeCanvas(w, h)
    const v = this.view.getContext('2d')!
    v.filter = `blur(${Math.max(3, w / 220)}px)`
    v.drawImage(scene, 0, 0)

    // Frost: feathery crystals, dense at the edges and fading towards the middle.
    this.frost = makeCanvas(w, h)
    const f = this.frost.getContext('2d')!
    const crystals = Math.round((w * h) / 380)
    f.lineCap = 'round'
    for (let i = 0; i < crystals; i++) {
      const x = rand(0, w)
      const y = rand(0, h)
      const edge = Math.min(x, y, w - x, h - y) / (Math.min(w, h) * 0.5)
      if (Math.random() < edge * 1.4) continue
      const len = rand(1.5, 5) * (1.2 - edge)
      const angle = rand(0, Math.PI)
      f.strokeStyle = `rgba(225, 235, 248, ${rand(0.06, 0.22) * (1 - edge)})`
      f.lineWidth = rand(0.4, 0.9)
      for (let arm = 0; arm < 3; arm++) {
        const a = angle + (arm * Math.PI) / 3
        f.beginPath()
        f.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len)
        f.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
        f.stroke()
      }
    }
    const haze = f.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
    haze.addColorStop(0, 'rgba(220, 230, 245, 0)')
    haze.addColorStop(1, 'rgba(220, 230, 245, 0.35)')
    f.fillStyle = haze
    f.fillRect(0, 0, w, h)

    this.flakes = []
    const count = Math.round(Math.min(380, w / 3.2))
    for (let i = 0; i < count; i++) this.flakes.push(this.newFlake(rand(0, h)))
  }

  private newFlake(y = -10): Flake {
    const depth = Math.random()
    return { x: rand(0, this.width), y, r: 0.6 + depth * 2.4, depth, phase: rand(0, Math.PI * 2) }
  }

  protected step(dt: number): void {
    for (const f of this.flakes) {
      f.y += (12 + f.depth * 38) * dt
      f.phase += dt * (0.6 + f.depth)
      f.x += Math.sin(f.phase) * (0.2 + f.depth * 0.5) + 6 * dt
      if (f.y > this.height + 5) Object.assign(f, this.newFlake())
      if (f.x > this.width + 5) f.x = -5
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.view) return
    ctx.drawImage(this.view, 0, 0)
    for (const f of this.flakes) {
      ctx.globalAlpha = 0.35 + f.depth * 0.55
      ctx.fillStyle = '#eef3fb'
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (this.frost) {
      ctx.globalAlpha = 0.1 + 0.85 * this.progress
      ctx.drawImage(this.frost, 0, 0)
      ctx.globalAlpha = 1
    }
  }
}
