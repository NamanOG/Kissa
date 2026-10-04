import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import styles from './DownloadButton.module.css'
import { MagneticButton } from './MagneticButton'
import { useLatestRelease } from '../../hooks/useLatestRelease'

interface DownloadButtonProps {
  size?: 'sm' | 'lg'
  /** Show version, size and platform under the button. */
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

function DownloadGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2v9m0 0L4.5 7.5M8 11l3.5-3.5M3 14h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Starts the installer download immediately: the link is the release's
 * .exe asset itself, which GitHub serves as an attachment, so the browser
 * downloads it in place without navigating anywhere.
 */
export function DownloadButton({ size = 'lg', showMeta = false, className = '' }: DownloadButtonProps) {
  const release = useLatestRelease()
  const [started, setStarted] = useState(false)
  const { setup } = release

  useEffect(() => {
    if (!started) return
    const t = setTimeout(() => setStarted(false), 6000)
    return () => clearTimeout(t)
  }, [started])

  const label = size === 'sm' ? 'Download' : 'Download for Windows'

  return (
    <div className={`${styles.wrap} ${size === 'lg' ? styles.lg : styles.sm} ${className}`}>
      <MagneticButton
        href={setup.url}
        download={setup.name}
        onClick={() => setStarted(true)}
        className={styles.button}
        strength={size === 'lg' ? 18 : 0}
        aria-label={`Download Kissa ${release.version} installer for Windows (${setup.sizeMb} MB)`}
      >
        <WindowsIcon className={styles.winIcon} />
        <span className={styles.labelWrap}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={started ? 'started' : 'idle'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={styles.label}
            >
              {started ? 'Downloading…' : label}
            </motion.span>
          </AnimatePresence>
        </span>
        {size === 'lg' && <DownloadGlyph className={styles.glyph} />}
      </MagneticButton>

      {showMeta && (
        <p className={styles.meta} aria-live="polite">
          {started ? (
            <>
              Run <span className={styles.file}>{setup.name}</span> when it finishes.
            </>
          ) : (
            <>
              v{release.version} &middot; {setup.sizeMb} MB &middot; Free
            </>
          )}
        </p>
      )}
    </div>
  )
}
