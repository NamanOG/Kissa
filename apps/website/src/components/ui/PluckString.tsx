import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import styles from './PluckString.module.css'

/** Vertical reach of the hit area, in px, either side of the string. */
const REACH = 28
/** How far past the pointer the string bows while held. */
const BOW = 1.9

/**
 * A section rule that behaves like a string: draw the pointer across it and
 * it bows, then rings back to rest. At rest it is an ordinary hairline.
 *
 * Mechanism adapted from Fancy Components' Elastic Line
 * (UI-Reference-System → fancy-components): a quadratic curve whose control
 * point follows the pointer, released into an under-damped spring.
 */
export function PluckString({ tone = 'light' }: { tone?: 'light' | 'ink' }) {
  const reduced = useReducedMotion()
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(0)
  const held = useRef(false)

  const cx = useMotionValue(0)
  const cy = useMotionValue(REACH)
  const d = useTransform([cx, cy], ([x, y]) => `M 0 ${REACH} Q ${x} ${y} ${width} ${REACH}`)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
      cx.set(entry.contentRect.width / 2)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [cx])

  const release = () => {
    if (!held.current) return
    held.current = false
    // Light damping so it visibly rings a few times, like a real string.
    animate(cy, REACH, { type: 'spring', stiffness: 520, damping: 7, mass: 0.6 })
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (reduced || e.pointerType !== 'mouse') return
    const rect = e.currentTarget.getBoundingClientRect()
    const offset = e.clientY - rect.top - REACH
    if (Math.abs(offset) > REACH - 2) {
      release()
      return
    }
    held.current = true
    cy.stop()
    cx.set(e.clientX - rect.left)
    cy.set(REACH + offset * BOW)
  }

  return (
    <div className={`${styles.wrap} ${tone === 'ink' ? styles.ink : ''}`} aria-hidden="true">
      <svg
        ref={svgRef}
        className={styles.svg}
        height={REACH * 2}
        onPointerMove={onPointerMove}
        onPointerLeave={release}
      >
        <motion.path d={d} className={styles.line} />
      </svg>
    </div>
  )
}
