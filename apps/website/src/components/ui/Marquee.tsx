import React from 'react'
import styles from './Marquee.module.css'

export interface MarqueeProps {
  children: React.ReactNode
  speed?: number // duration in seconds
  pauseOnHover?: boolean
  className?: string
  direction?: 'left' | 'right'
}

export function Marquee({
  children,
  speed = 35,
  pauseOnHover = true,
  className = '',
  direction = 'left'
}: MarqueeProps) {
  return (
    <div
      className={`${styles.marquee} ${pauseOnHover ? styles.pauseOnHover : ''} ${className}`}
      style={{ '--speed': `${speed}s` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={`${styles.track} ${direction === 'right' ? styles.reverse : ''}`}>
        <div className={styles.content}>{children}</div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
