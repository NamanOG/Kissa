import { SceneBase, drawBokeh, lerp, makeCanvas, rand, weighted } from './SceneBase'

/**
 * Forest: a woodland canopy out of focus, light coming through the leaves as soft discs,
 * the way a lens sees a forest when it is focused on something near. The canopy sways a
 * little. Through a block the light moves from the cool green of early morning to a warm
 * midday glow; a break returns it to morning.
 */

export class ForestScene extends SceneBase {
  private canopy: HTMLCanvasElement | null = null
  private sun: HTMLCanvasElement | null = null
  private time = 0

  protected build(): void {
    const { width: w, height: h } = this
    // A little larger than the view so it can sway without showing an edge.
    const pad = Math.round(w * 0.04)
    const scene = makeCanvas(w + pad * 2, h + pad * 2)
    const g = scene.getContext('2d')!
    const sw = scene.width
    const sh = scene.height

    const base = g.createLinearGradient(0, 0, 0, sh)
    base.addColorStop(0, '#16231b')
    base.addColorStop(0.5, '#0f1a14')
    base.addColorStop(1, '#0a110d')
    g.fillStyle = base
    g.fillRect(0, 0, sw, sh)

    // Dark masses of foliage between the light.
    for (let i = 0; i < 40; i++) {
      const x = rand(0, sw)
      const y = rand(0, sh)
      const r = rand(sw * 0.05, sw * 0.14)
      const leaf = g.createRadialGradient(x, y, 0, x, y, r)
      leaf.addColorStop(0, `rgba(${rand(20, 40) | 0}, ${rand(48, 72) | 0}, ${rand(30, 44) | 0}, 0.5)`)
      leaf.addColorStop(1, 'rgba(10, 18, 13, 0)')
      g.fillStyle = leaf
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }

    // Light through the leaves, densest towards the top where the canopy opens.
    drawBokeh(g, Math.round(sw / 7), () => {
      const y = Math.pow(Math.random(), 1.6) * sh * 0.85
      return {
        x: rand(0, sw),
        y,
        r: rand(sw * 0.008, sw * 0.04),
        rgb: weighted([
          ['196, 226, 150', 4],
          ['232, 240, 190', 3],
          ['150, 200, 130', 3],
          ['255, 240, 200', 1]
        ]),
        alpha: rand(0.06, 0.24) * (1 - y / sh) + 0.03
      }
    })

    this.canopy = makeCanvas(sw, sh)
    const c = this.canopy.getContext('2d')!
    c.filter = `blur(${Math.max(5, w / 140)}px)`
    c.drawImage(scene, 0, 0)

    // Sunlight from the upper right, shown more strongly as the block goes on.
    this.sun = makeCanvas(w, h)
    const s = this.sun.getContext('2d')!
    const glow = s.createRadialGradient(w * 0.78, h * 0.08, 0, w * 0.78, h * 0.08, Math.hypot(w, h) * 0.75)
    glow.addColorStop(0, 'rgba(255, 228, 160, 0.42)')
    glow.addColorStop(0.4, 'rgba(255, 214, 140, 0.14)')
    glow.addColorStop(1, 'rgba(255, 214, 140, 0)')
    s.fillStyle = glow
    s.fillRect(0, 0, w, h)
  }

  protected step(dt: number): void {
    this.time += dt
  }

  protected draw(): void {
    const ctx = this.ctx
    const { width: w, height: h } = this
    if (!this.canopy || !this.sun) return
    const pad = (this.canopy.width - w) / 2
    // A slow sway, as branches move in a breeze.
    const sway = this.reducedMotion ? 0 : Math.sin(this.time * 0.18) * pad * 0.5
    const lift = this.reducedMotion ? 0 : Math.sin(this.time * 0.11 + 1) * pad * 0.25
    ctx.drawImage(this.canopy, -pad + sway, -pad + lift)

    const p = this.progress
    // Morning is cool and dim; midday warm and bright.
    ctx.fillStyle = `rgba(10, 24, 30, ${lerp(0.35, 0, p)})`
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = lerp(0.25, 1, p)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(this.sun, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
}
