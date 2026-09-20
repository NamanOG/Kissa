import styles from './DownloadCta.module.css'
import { MagneticButton } from './ui/MagneticButton'

const RELEASES_URL = 'https://github.com/NamanOG/Kissa/releases/latest'
const GITHUB_URL = 'https://github.com/NamanOG/Kissa'
const PRODUCT_VERSION = '4.1.1'

export function DownloadCta() {
  return (
    <section id="download" className={styles.section} aria-labelledby="download-heading">
      <div className={styles.vinylBackdrop} aria-hidden="true">
        <div className={styles.grooveCircle1} />
        <div className={styles.grooveCircle2} />
        <div className={styles.grooveCircle3} />
        <div className={styles.grooveGlow} />
      </div>

      <div className="container">
        <div className={styles.content}>
          <span className={styles.eyebrow}>GET KISSA &bull; V{PRODUCT_VERSION}</span>
          <h2 id="download-heading" className={styles.title}>
            Bring your records to your desktop.
          </h2>
          <p className={styles.desc}>
            Download Kissa for Windows 10 &amp; 11. Free, open source, and designed to turn every listening session
            into a deliberate ritual.
          </p>

          <div className={styles.actions}>
            <MagneticButton
              href={RELEASES_URL}
              className={styles.btnPrimary}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Kissa for Windows — opens latest GitHub release in new tab"
            >
              <svg
                className={styles.winIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              Download for Windows
            </MagneticButton>

            <a
              href={GITHUB_URL}
              className={styles.btnSecondary}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Kissa on GitHub (opens in new tab)"
            >
              View on GitHub ↗
            </a>
          </div>

          <p className={styles.note}>
            Windows 10 &amp; 11 &bull; Connects with Spotify, Apple Music, TIDAL, and local files
          </p>
        </div>
      </div>
    </section>
  )
}
