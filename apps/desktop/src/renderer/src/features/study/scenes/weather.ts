import { rand } from './SceneBase'

/**
 * Weather drawn in front of a view: falling rain, snowfall, falling leaves and shooting
 * stars. Each layer has depth (near things are bigger, faster and softer; far things are
 * fine and faint) and a gentle wind that rises and falls, which is most of what makes
 * weather read as real rather than as particles.
 */

/** A slow gusting wind, shared by a scene's layers: -1..1. */
export class Wind {
  private t = rand(0, 100)
  value = 0
  step(dt: number): void {
    this.t += dt
    this.value = Math.sin(this.t * 0.11) * 0.6 + Math.sin(this.t * 0.37 + 1.3) * 0.3 + Math.sin(this.t * 1.1) * 0.1
  }
}

// ---- Rain ---------------------------------------------------------------------

interface Drop {
  x: number
  y: number
  z: number
  len: number
  speed: number
}

export class RainLayer {
  private drops: Drop[] = []
  constructor(
    private w: number,
    private h: number,
    density = 1
  ) {
    const count = Math.round((w / 2.4) * density)
    for (let i = 0; i < count; i++) this.drops.push(this.make(rand(-h, h)))
  }

  private make(y: number): Drop {
    // Most rain is far away and faint; a little falls close to the glass.
    const z = Math.pow(Math.random(), 2.2)
    return {
      x: rand(-this.w * 0.1, this.w * 1.1),
      y,
      z,
      len: this.h * (0.025 + z * 0.09),
      speed: this.h * (1.1 + z * 1.6)
    }
  }

  step(dt: number, wind: number): void {
    for (const d of this.drops) {
      d.y += d.speed * dt
      d.x += d.speed * dt * (0.08 + wind * 0.12)
      if (d.y > this.h + d.len) Object.assign(d, this.make(-d.len - rand(0, this.h * 0.2)))
    }
  }

  draw(ctx: CanvasRenderingContext2D, wind: number, strength = 1): void {
    ctx.lineCap = 'round'
    const slant = 0.08 + wind * 0.12
    for (const d of this.drops) {
      ctx.strokeStyle = `rgba(210, 222, 236, ${(0.05 + d.z * 0.22) * strength})`
      ctx.lineWidth = 0.6 + d.z * 1.4
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - d.len * slant, d.y - d.len)
      ctx.stroke()
    }
  }
}

// ---- Snow ---------------------------------------------------------------------

interface Flake {
  x: number
  y: number
  z: number
  r: number
  phase: number
  spin: number
}

export class SnowLayer {
  private flakes: Flake[] = []
  constructor(
    private w: number,
    private h: number,
    density = 1
  ) {
    const count = Math.round((w / 3) * density)
    for (let i = 0; i < count; i++) this.flakes.push(this.make(rand(0, h)))
  }

  private make(y: number): Flake {
    const z = Math.pow(Math.random(), 1.7)
    return { x: rand(-this.w * 0.1, this.w * 1.1), y, z, r: 0.7 + z * 3.2, phase: rand(0, 6.3), spin: rand(0.4, 1.4) }
  }

  step(dt: number, wind: number): void {
    for (const f of this.flakes) {
      f.phase += dt * f.spin
      f.y += (14 + f.z * 52) * dt
      f.x += (Math.sin(f.phase) * (6 + f.z * 14) + wind * (20 + f.z * 60)) * dt
      if (f.y > this.h + 10) Object.assign(f, this.make(-10))
      if (f.x > this.w + 20) f.x = -20
      else if (f.x < -20) f.x = this.w + 20
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const f of this.flakes) {
      if (f.z > 0.75) {
        // Close to the glass: big, soft and bright.
        const r = f.r * 1.8
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
        g.addColorStop(0, 'rgba(245, 248, 255, 0.75)')
        g.addColorStop(0.45, 'rgba(245, 248, 255, 0.35)')
        g.addColorStop(1, 'rgba(245, 248, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = `rgba(240, 244, 252, ${0.35 + f.z * 0.6})`
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

// ---- Falling leaves ---------------------------------------------------------------

interface Leaf {
  x: number
  y: number
  z: number
  size: number
  rot: number
  rotSpeed: number
  flip: number
  flipSpeed: number
  sway: number
  colour: string
}

const LEAF_COLOURS = ['#c98a3b', '#b5652c', '#8f9a3a', '#d2a24c', '#7a8a35', '#a8482a']

export class LeafLayer {
  private leaves: Leaf[] = []
  constructor(
    private w: number,
    private h: number,
    count = 18
  ) {
    for (let i = 0; i < count; i++) this.leaves.push(this.make(rand(-h, h)))
  }

  private make(y: number): Leaf {
    const z = Math.random()
    return {
      x: rand(-this.w * 0.1, this.w * 1.05),
      y,
      z,
      size: 5 + z * 13,
      rot: rand(0, 6.3),
      rotSpeed: rand(-1.2, 1.2),
      flip: rand(0, 6.3),
      flipSpeed: rand(1.5, 3.5),
      sway: rand(0, 6.3),
      colour: LEAF_COLOURS[(Math.random() * LEAF_COLOURS.length) | 0]
    }
  }

  step(dt: number, wind: number): void {
    for (const l of this.leaves) {
      l.sway += dt * 0.9
      l.flip += dt * l.flipSpeed
      l.rot += dt * l.rotSpeed
      // Leaves drift and flutter: they slow when broadside and slip when edge-on.
      const edgeOn = Math.abs(Math.cos(l.flip))
      l.y += (16 + l.z * 30) * (0.5 + edgeOn) * dt
      l.x += (Math.sin(l.sway) * (18 + l.z * 26) + wind * (30 + l.z * 50)) * dt
      if (l.y > this.h + 30) Object.assign(l, this.make(-30))
      if (l.x > this.w + 40) l.x = -40
      else if (l.x < -40) l.x = this.w + 40
    }
  }

  draw(ctx: CanvasRenderingContext2D, light = 1): void {
    for (const l of this.leaves) {
      ctx.save()
      ctx.translate(l.x, l.y)
      ctx.rotate(l.rot)
      ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(l.flip))))
      ctx.globalAlpha = (0.55 + l.z * 0.4) * light
      ctx.fillStyle = l.colour
      const s = l.size
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.55, s, 0)
      ctx.quadraticCurveTo(-s * 0.2, s * 0.55, -s, 0)
      ctx.fill()
      ctx.strokeStyle = 'rgba(40, 25, 10, 0.35)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.lineTo(s * 0.9, 0)
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
}

// ---- Shooting stars -----------------------------------------------------------------

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

export class ShootingStars {
  private meteors: Meteor[] = []
  private wait = rand(4, 10)
  constructor(
    private w: number,
    private h: number
  ) {}

  step(dt: number, frequency = 1): void {
    this.wait -= dt * frequency
    if (this.wait <= 0) {
      this.wait = rand(7, 20)
      const fromLeft = Math.random() > 0.5
      const speed = rand(this.w * 0.45, this.w * 0.8)
      const angle = rand(0.25, 0.5)
      this.meteors.push({
        x: fromLeft ? rand(this.w * 0.05, this.w * 0.5) : rand(this.w * 0.5, this.w * 0.95),
        y: rand(0, this.h * 0.3),
        vx: (fromLeft ? 1 : -1) * speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        life: 0,
        max: rand(0.6, 1.1)
      })
    }
    for (const m of this.meteors) {
      m.life += dt
      m.x += m.vx * dt
      m.y += m.vy * dt
    }
    this.meteors = this.meteors.filter((m) => m.life < m.max)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const m of this.meteors) {
      const t = m.life / m.max
      const fade = Math.sin(t * Math.PI)
      const tailX = m.x - m.vx * 0.18
      const tailY = m.y - m.vy * 0.18
      const g = ctx.createLinearGradient(m.x, m.y, tailX, tailY)
      g.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`)
      g.addColorStop(0.3, `rgba(200, 220, 255, ${0.35 * fade})`)
      g.addColorStop(1, 'rgba(200, 220, 255, 0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(tailX, tailY)
      ctx.stroke()
      ctx.fillStyle = `rgba(255, 255, 255, ${fade})`
      ctx.beginPath()
      ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
