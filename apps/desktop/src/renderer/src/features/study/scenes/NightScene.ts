import { SceneBase, makeCanvas, rand } from './SceneBase'

/**
 * Starry night: a quiet sky over low hills and a sleeping town. Stars come out as a block
 * runs, a few at a time, until the sky is full; a break leaves only the brightest. Now and
 * then a meteor.
 */

interface Star {
  x: number
  y: number
  r: number
  /** Progress at which it appears. */
  threshold: number
  phase: number
  speed: number
  warm: boolean
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

export class NightScene extends SceneBase {
  private backdrop: HTMLCanvasElement | null = null
  private land: HTMLCanvasElement | null = null
  private stars: Star[] = []
  private meteor: Meteor | null = null
  private nextMeteor = rand(20, 45)

  protected build(): void {
    const { width: w, height: h } = this
    this.backdrop = makeCanvas(w, h)
    const b = this.backdrop.getContext('2d')!
    const sky = b.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#05070f')
    sky.addColorStop(0.6, '#0e1530')
    sky.addColorStop(1, '#1d1f3a')
    b.fillStyle = sky
    b.fillRect(0, 0, w, h)
    // A faint band of the Milky Way.
    b.save()
    b.translate(w * 0.5, h * 0.35)
    b.rotate(-0.45)
    const band = b.createLinearGradient(0, -h * 0.18, 0, h * 0.18)
    band.addColorStop(0, 'rgba(150, 160, 210, 0)')
    band.addColorStop(0.5, 'rgba(170, 175, 220, 0.09)')
    band.addColorStop(1, 'rgba(150, 160, 210, 0)')
    b.fillStyle = band
    b.fillRect(-w, -h * 0.18, w * 2, h * 0.36)
    b.restore()
    // The moon, a low glow at the right.
    const moon = b.createRadialGradient(w * 0.82, h * 0.2, 0, w * 0.82, h * 0.2, w * 0.12)
    moon.addColorStop(0, 'rgba(240, 236, 220, 0.9)')
    moon.addColorStop(0.08, 'rgba(240, 236, 220, 0.6)')
    moon.addColorStop(0.1, 'rgba(200, 205, 230, 0.12)')
    moon.addColorStop(1, 'rgba(200, 205, 230, 0)')
    b.fillStyle = moon
    b.fillRect(0, 0, w, h)

    this.land = makeCanvas(w, h)
    const l = this.land.getContext('2d')!
    const hills: Array<[number, string]> = [
      [0.7, '#0d1124'],
      [0.8, '#080b18']
    ]
    for (const [base, colour] of hills) {
      l.fillStyle = colour
      l.beginPath()
      l.moveTo(0, h)
      for (let x = 0; x <= w; x += w / 40) {
        l.lineTo(x, h * base + Math.sin(x / w * 7 + base * 10) * h * 0.025 + Math.sin(x / w * 19) * h * 0.008)
      }
      l.lineTo(w, h)
      l.fill()
    }
    for (let i = 0; i < 26; i++) {
      const x = rand(w * 0.05, w * 0.95)
      const y = rand(h * 0.82, h * 0.92)
      l.fillStyle = `rgba(255, ${rand(180, 210) | 0}, ${rand(110, 150) | 0}, ${rand(0.4, 0.85)})`
      l.fillRect(x, y, rand(1.5, 3), rand(1.5, 2.5))
    }

    this.stars = []
    const count = Math.round(Math.min(700, (w * h) / 1500))
    for (let i = 0; i < count; i++) {
      const bright = Math.random() > 0.93
      this.stars.push({
        x: rand(0, w),
        y: rand(0, h * 0.78),
        r: bright ? rand(1.2, 2) : rand(0.4, 1.1),
        // The brightest few are always out; the rest appear across the block.
        threshold: bright ? 0 : Math.pow(Math.random(), 0.8),
        phase: rand(0, 6.3),
        speed: rand(0.5, 2),
        warm: Math.random() > 0.8
      })
    }
  }

  protected step(dt: number): void {
    for (const s of this.stars) s.phase += dt * s.speed
    if (this.meteor) {
      const m = this.meteor
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.life -= dt
      if (m.life <= 0) this.meteor = null
    } else if (this.active) {
      this.nextMeteor -= dt
      if (this.nextMeteor <= 0) {
        this.nextMeteor = rand(35, 90)
        this.meteor = { x: rand(this.width * 0.2, this.width * 0.9), y: rand(0, this.height * 0.25), vx: -rand(260, 380), vy: rand(90, 150), life: 0.9 }
      }
    }
  }

  protected draw(): void {
    const ctx = this.ctx
    if (!this.backdrop || !this.land) return
    ctx.drawImage(this.backdrop, 0, 0)
    const shown = 0.08 + 0.92 * this.progress
    for (const s of this.stars) {
      if (s.threshold > shown) continue
      // Fade each star in over a short stretch after its threshold.
      const fadeIn = Math.min(1, (shown - s.threshold) / 0.06)
      const twinkle = this.reducedMotion ? 0.85 : 0.65 + 0.35 * Math.sin(s.phase)
      ctx.globalAlpha = fadeIn * twinkle
      ctx.fillStyle = s.warm ? '#ffe6c4' : '#e6edff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (this.meteor && !this.reducedMotion) {
      const m = this.meteor
      const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.25, m.y - m.vy * 0.25)
      tail.addColorStop(0, `rgba(255, 255, 255, ${0.8 * Math.min(1, m.life * 2)})`)
      tail.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.strokeStyle = tail
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 0.25, m.y - m.vy * 0.25)
      ctx.stroke()
    }
    ctx.drawImage(this.land, 0, 0)
  }
}
