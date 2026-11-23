import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { AmbientKind } from '../data/scenes'
import { useInView } from '../lib/useInView'

interface Mote {
  x: number
  y: number
  size: number
  speed: number
  phase: number
}

const COUNT: Record<AmbientKind, number> = { rain: 90, fireflies: 22, stars: 46, motes: 26, bubbles: 18 }

/** The weather inside a painting: one small canvas that only runs while its room is on screen. */
export function Ambient({ kind, className }: { kind: AmbientKind; className?: string }) {
  const [wrap, inView] = useInView<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || !inView || reduced) return

    let width = 0
    let height = 0
    const resize = () => {
      width = element.clientWidth
      height = element.clientHeight
      element.width = width
      element.height = height
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)

    const motes: Mote[] = Array.from({ length: COUNT[kind] }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random(),
      speed: 0.5 + Math.random(),
      phase: Math.random() * Math.PI * 2
    }))

    let frame = 0
    let last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67
      last = now
      context.clearRect(0, 0, width, height)
      const t = now / 1000

      for (const m of motes) {
        const px = m.x * width
        const py = m.y * height
        if (kind === 'rain') {
          m.y += 0.018 * m.speed * dt
          m.x -= 0.0014 * m.speed * dt
          context.strokeStyle = `rgba(226, 232, 255, ${0.1 + m.size * 0.12})`
          context.lineWidth = m.size
          context.beginPath()
          context.moveTo(px, py)
          context.lineTo(px - 2.2, py + 15 * m.speed)
          context.stroke()
        } else if (kind === 'stars') {
          const glow = 0.25 + 0.75 * Math.pow(Math.sin(t * m.speed + m.phase) * 0.5 + 0.5, 3)
          context.fillStyle = `rgba(255, 246, 220, ${glow})`
          context.beginPath()
          context.arc(px, py * 0.62, m.size, 0, Math.PI * 2)
          context.fill()
        } else if (kind === 'bubbles') {
          m.y -= 0.0012 * m.speed * dt
          context.strokeStyle = 'rgba(214, 255, 247, 0.42)'
          context.lineWidth = 1
          context.beginPath()
          context.arc(px + Math.sin(t + m.phase) * 8, py, m.size * 3, 0, Math.PI * 2)
          context.stroke()
        } else {
          const firefly = kind === 'fireflies'
          m.x += Math.sin(t * 0.4 + m.phase) * 0.00045 * dt
          m.y += (firefly ? Math.cos(t * 0.5 + m.phase) * 0.0005 : -0.00035 * m.speed) * dt
          const pulse = firefly ? Math.pow(Math.sin(t * m.speed + m.phase) * 0.5 + 0.5, 2) : 0.42
          const radius = firefly ? m.size * 7 : m.size * 2.6
          const gradient = context.createRadialGradient(px, py, 0, px, py, radius)
          gradient.addColorStop(0, firefly ? `rgba(226, 255, 132, ${pulse})` : `rgba(255, 232, 178, ${pulse})`)
          gradient.addColorStop(1, 'rgba(255, 232, 178, 0)')
          context.fillStyle = gradient
          context.fillRect(px - radius, py - radius, radius * 2, radius * 2)
        }
        if (m.y > 1.05) m.y = -0.05
        if (m.y < -0.05) m.y = 1.05
        if (m.x < -0.03) m.x = 1.03
        if (m.x > 1.03) m.x = -0.03
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [kind, inView, reduced])

  return (
    <div ref={wrap} className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      <canvas ref={canvas} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
