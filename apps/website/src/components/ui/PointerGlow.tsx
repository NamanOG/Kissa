import React, { useRef, useState } from 'react'
import styles from './PointerGlow.module.css'

export interface PointerGlowProps {
  children: React.ReactNode
  color?: string
  size?: number
  className?: string
}

export function PointerGlow({
  children,
  color = 'rgba(224, 142, 69, 0.1)',
  size = 450,
  className = ''
}: PointerGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -1000, y: -1000 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${styles.container} ${className}`}
    >
      <div
        className={styles.glow}
        style={{
          transform: `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`,
          width: `${size}px`,
          height: `${size}px`,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity
        }}
        aria-hidden="true"
      />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}
