import { useState } from 'react'
import styles from './ProductMedia.module.css'
import { ProductSlotConfig, PRODUCT_SLOTS } from '../data/productSlots'
export type { ProductSlotConfig }

interface ProductMediaProps {
  slot: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: string
  priority?: boolean
  className?: string
}

export function ProductMedia({
  slot,
  alt,
  width = 1600,
  height = 1000,
  aspectRatio,
  priority = false,
  className = ''
}: ProductMediaProps) {
  const [isMissing, setIsMissing] = useState(false)
  const slotInfo = PRODUCT_SLOTS[slot]
  const targetSrc = `/product/${slot}`
  const effectiveAspect = aspectRatio || slotInfo?.aspectRatio || '16 / 10'

  if (isMissing) {
    return (
      <div
        className={`${styles.placeholder} ${className}`}
        style={{ aspectRatio: effectiveAspect }}
        role="region"
        aria-label={`Product capture pending: ${slotInfo?.title || slot}`}
      >
        <div className={styles.placeholderInner}>
          <div className={styles.placeholderIcon} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className={styles.placeholderBadge}>INTERFACE PREVIEW</div>
          <div className={styles.placeholderTitle}>{slotInfo?.title || slot}</div>
          <p className={styles.placeholderState}>{slotInfo?.expectedState || alt}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.wrap} ${className}`}>
      <img
        src={targetSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setIsMissing(true)}
        className={styles.img}
      />
      <div className={styles.badge}>
        <span className={styles.badgeDot} />
        <span>REAL PRODUCT CAPTURE</span>
      </div>
    </div>
  )
}
