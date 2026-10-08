import styles from './DownloadButton.module.css'
import { MagneticButton } from './MagneticButton'
import { STORE_URL } from '../../lib/links'

interface DownloadButtonProps {
  size?: 'sm' | 'lg'
  /** Show price and platform under the button. */
  showMeta?: boolean
  className?: string
}

export function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  )
}

function OpenGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12 12 4M6 4h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Opens Kissa's Microsoft Store page, which installs it and keeps it updated.
 */
export function DownloadButton({ size = 'lg', showMeta = false, className = '' }: DownloadButtonProps) {
  return (
    <div className={`${styles.wrap} ${size === 'lg' ? styles.lg : styles.sm} ${className}`}>
      <MagneticButton
        href={STORE_URL}
        target="_blank"
        rel="noopener"
        className={styles.button}
        strength={size === 'lg' ? 18 : 0}
        aria-label="Get Kissa from the Microsoft Store (opens in a new tab)"
      >
        <WindowsIcon className={styles.winIcon} />
        <span className={styles.label}>{size === 'sm' ? 'Get Kissa' : 'Get it from Microsoft Store'}</span>
        {size === 'lg' && <OpenGlyph className={styles.glyph} />}
      </MagneticButton>

      {showMeta && <p className={styles.meta}>Free &middot; Windows 10 &amp; 11 &middot; Updates itself</p>}
    </div>
  )
}
