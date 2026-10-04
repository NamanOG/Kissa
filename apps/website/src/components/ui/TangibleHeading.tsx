import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

/* Resting and fully "pressed" settings on Mona Sans's two axes. */
const REST = { wdth: 118, wght: 500 }
const PRESSED = { wdth: 125, wght: 760 }
const RADIUS = 190 // px of pointer influence

interface TangibleHeadingProps {
  lines: string[]
  className?: string
  id?: string
  delay?: number
}

/**
 * The hero headline, made literal: the letters swell under the pointer, as
 * if the type had weight you could press into.
 *
 * Adapted from Fancy Components' Variable Font Cursor Proximity
 * (UI-Reference-System → fancy-components). It drives the variable font's
 * width and weight axes per letter; nothing runs on touch devices or under
 * reduced motion, and the heading stays a normal <h1> for assistive tech.
 */
export function TangibleHeading({ lines, className, id, delay = 0 }: TangibleHeadingProps) {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || !window.matchMedia('(pointer: fine)').matches) return

    const letters = Array.from(root.querySelectorAll<HTMLElement>('[data-letter]'))
    const level = letters.map(() => 0) // eased 0..1 per letter
    const pointer = { x: -9999, y: -9999 }
    let frame = 0

    const tick = () => {
      let moving = false
      letters.forEach((el, i) => {
        // Measured each frame: the heading sits in a pinned, transformed scene.
        const rect = el.getBoundingClientRect()
        const dist = Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2))
        const target = Math.max(0, 1 - dist / RADIUS) ** 2
        const next = level[i] + (target - level[i]) * 0.16
        if (Math.abs(next - level[i]) > 0.002) moving = true
        level[i] = next
        el.style.fontStretch = `${REST.wdth + (PRESSED.wdth - REST.wdth) * next}%`
        el.style.fontWeight = String(Math.round(REST.wght + (PRESSED.wght - REST.wght) * next))
      })
      frame = moving ? requestAnimationFrame(tick) : 0
    }

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const onLeave = () => {
      pointer.x = pointer.y = -9999
      if (!frame) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [reduced])

  return (
    <h1 ref={rootRef} className={className} id={id} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}
        >
          <motion.span
            style={{ display: 'block' }}
            initial={reduced ? false : { y: '105%' }}
            animate={{ y: '0%' }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.09 }}
          >
            {line.split(' ').map((word, w) => (
              <span key={w} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {Array.from(word).map((char, j) => (
                  <span key={j} data-letter style={{ display: 'inline-block' }}>
                    {char}
                  </span>
                ))}
                {w < line.split(' ').length - 1 && ' '}
              </span>
            ))}
          </motion.span>
        </span>
      ))}
    </h1>
  )
}
