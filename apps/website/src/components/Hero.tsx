import styles from './Hero.module.css'
import { SplitText } from './ui/SplitText'
import { MagneticButton } from './ui/MagneticButton'
import { Marquee } from './ui/Marquee'

const RELEASES_URL = 'https://github.com/NamanOG/Kissa/releases/latest'
const GITHUB_URL = 'https://github.com/NamanOG/Kissa'
const WELCOME_HERO_SRC = '/kissa_welcome_hero.jpg'
const LOGO_SRC = '/kissa_logo.png'

const MARQUEE_ITEMS = [
  'ALBUMS, NOT ALGORITHMS',
  'A QUIET PLACE FOR MUSIC',
  'MADE FOR THE LISTENING MOMENT',
  'TACTILE VINYL PRESENCE',
  'FREE & OPEN SOURCE',
  'WINDOWS 10 & 11'
]

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.hero__ambient} aria-hidden="true" />

      <div className={`container ${styles.hero__inner}`}>
        <div className={styles.hero__text}>
          <div className={styles.hero__label}>
            <span className={styles['hero__label-dot']} />
            <span>Desktop Vinyl Companion</span>
            <span className={styles.hero__platform}>Windows 10 &amp; 11</span>
          </div>

          <h1 id="hero-heading" className={styles.hero__heading}>
            <SplitText
              text="Music made tangible on your desktop."
              as="span"
              duration={0.65}
              stagger={0.035}
            />
          </h1>

          <p className={styles.hero__description}>
            Kissa transforms what’s already playing on your computer into a quiet, tactile vinyl ritual.
            It observes active media sessions across Spotify, Apple Music, TIDAL, and local players—bringing
            physical platter rotation, tonearm tracking, and synchronized lyrics to your workspace.
          </p>

          <div className={styles['hero__cta-group']}>
            <MagneticButton
              href={RELEASES_URL}
              className={styles['hero__cta-primary']}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Kissa for Windows — opens latest GitHub release in new tab"
            >
              <svg
                className={styles['hero__cta-icon']}
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
              className={styles['hero__cta-ghost']}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Kissa source code on GitHub (opens in new tab)"
            >
              GitHub ↗
            </a>
          </div>

          <div className={styles.hero__meta}>
            <span className={styles['hero__meta-dot']} aria-hidden="true" />
            <span>Free &amp; Open Source &bull; No login required</span>
          </div>
        </div>

        <div className={styles.hero__visual}>
          <div className={styles.hero__frame}>
            <img
              src={WELCOME_HERO_SRC}
              alt="Japanese Jazz Kissa listening room with high-fidelity vinyl player and floor-to-ceiling record shelves"
              className={styles.hero__photo}
              width={960}
              height={640}
              loading="eager"
              decoding="async"
            />
            <div className={styles['hero__photo-overlay']} aria-hidden="true" />

            <div className={styles['hero__photo-badge']} aria-hidden="true">
              <img src={LOGO_SRC} alt="" width={48} height={48} className={styles['hero__photo-badge-img']} />
            </div>

            <div className={styles['hero__photo-caption']}>
              <span className={styles['hero__caption-tag']}>ATMOSPHERE</span>
              <span>Jazz Kissa listening culture</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.marqueeSection}>
        <Marquee speed={30} className={styles.marqueeWrap}>
          {MARQUEE_ITEMS.map((item, idx) => (
            <span key={idx} className={styles.marqueeItem}>
              <span>{item}</span>
              <span className={styles.marqueeDot} aria-hidden="true">&bull;</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
