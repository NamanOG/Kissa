import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export interface MagneticButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  children: React.ReactNode
  /** Percentage of cursor offset the button follows (0–100). */
  strength?: number
}

/**
 * MagneticButton — adapted from UI-Reference-System/components/buttons/magnetic-button.
 * Pulls gently toward the cursor. Caches the rect on enter (no per-frame layout
 * reads), and is inert on touch devices and under reduced motion.
 */
export function MagneticButton({
  children,
  strength = 22,
  onMouseEnter,
  onMouseLeave,
  onBlur,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isCoarse, setIsCoarse] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    setIsCoarse(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const inert = reduced || isCoarse

  const handleEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      rectRef.current = ref.current?.getBoundingClientRect() ?? null
      onMouseEnter?.(e)
    },
    [onMouseEnter]
  )

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = rectRef.current
    if (inert || !rect) return
    setOffset({
      x: (e.clientX - (rect.left + rect.width / 2)) * (strength / 100),
      y: (e.clientY - (rect.top + rect.height / 2)) * (strength / 100)
    })
  }

  const reset = () => {
    setOffset({ x: 0, y: 0 })
    rectRef.current = null
  }

  return (
    <motion.a
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={(e) => {
        reset()
        onMouseLeave?.(e)
      }}
      onBlur={(e) => {
        reset()
        onBlur?.(e)
      }}
      animate={{ x: inert ? 0 : offset.x, y: inert ? 0 : offset.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, mass: 0.2 }}
      {...props}
    >
      {children}
    </motion.a>
  )
}
