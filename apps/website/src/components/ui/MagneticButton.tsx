import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

export interface MagneticButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  children: React.ReactNode
  className?: string
  strength?: number
  radius?: number
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.35,
  radius = 140,
  style,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  // Sona UI spring physics configuration
  const springConfig = { stiffness: 200, damping: 14, mass: 0.4 }
  const x = useSpring(rawX, springConfig)
  const y = useSpring(rawY, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    if (!ref.current) return

    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2

    const deltaX = e.clientX - centerX
    const deltaY = e.clientY - centerY
    const distance = Math.hypot(deltaX, deltaY)

    if (distance < radius) {
      rawX.set(deltaX * strength)
      rawY.set(deltaY * strength)
    } else {
      rawX.set(0)
      rawY.set(0)
    }
  }

  const handleMouseLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <motion.a
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        x,
        y,
        display: 'inline-flex'
      }}
      {...props}
    >
      {children}
    </motion.a>
  )
}
