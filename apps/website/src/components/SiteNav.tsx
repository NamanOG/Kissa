import { useEffect, useState } from 'react'
import styles from './SiteNav.module.css'

const GITHUB_URL = 'https://github.com/NamanOG/Kissa'
const RELEASES_URL = 'https://github.com/NamanOG/Kissa/releases/latest'

interface NavItem {
  label: string
  href: string
  id: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Experience', href: '#showcase', id: 'showcase' },
  { label: 'Motion', href: '#demo', id: 'demo' },
  { label: 'Rooms', href: '#environments', id: 'environments' },
  { label: 'Story', href: '#about', id: 'about' }
]

export function SiteNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 30)

      // Determine active section
      const sections = NAV_ITEMS.map((item) => document.getElementById(item.id))
      const scrollPos = window.scrollY + 200

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i]
        if (sec && sec.offsetTop <= scrollPos) {
          setActiveSection(NAV_ITEMS[i].id)
          return
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('')
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.nav}${isScrolled ? ` ${styles['is-scrolled']}` : ''}`}>
      <nav className={`container ${styles.nav__inner}`} aria-label="Main site navigation">
        {/* Skip-to-content link for keyboard accessibility */}
        <a href="#main-content" className="sr-only">
          Skip to main content
        </a>

        <a href="#main-content" className={styles.nav__brand} aria-label="Kissa — Return to top">
          <img
            src="/kissa_logo.png"
            alt=""
            className={styles.nav__logo}
            width={28}
            height={28}
            aria-hidden="true"
          />
          <span className={styles.nav__wordmark}>Kissa</span>
        </a>

        <ul className={styles.nav__links} role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`${styles.nav__link}${isActive ? ` ${styles['is-active']}` : ''}`}
                >
                  {item.label}
                  {isActive && <span className={styles.nav__activeDot} aria-hidden="true" />}
                </a>
              </li>
            )
          })}
        </ul>

        <div className={styles.nav__actions}>
          <a
            href={GITHUB_URL}
            className={styles.nav__github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Kissa on GitHub (opens in new tab)"
          >
            GitHub ↗
          </a>
          <a
            href={RELEASES_URL}
            className={styles.nav__cta}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download Kissa for Windows (opens GitHub releases in new tab)"
          >
            <svg
              className={styles['nav__cta-icon']}
              viewBox="0 0 24 24"
              fill="currentColor"
              width="13"
              height="13"
              aria-hidden="true"
            >
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
            Download
          </a>

          <button
            type="button"
            className={styles.nav__toggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className={`${styles.nav__bar}${mobileMenuOpen ? ` ${styles['is-open']}` : ''}`} />
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className={styles.nav__mobile} role="dialog" aria-label="Mobile Navigation">
          <ul className={styles['nav__mobile-list']} role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`${styles['nav__mobile-link']}${activeSection === item.id ? ` ${styles['is-active']}` : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className={styles['nav__mobile-divider']} />
            <li>
              <a
                href={GITHUB_URL}
                className={styles['nav__mobile-link']}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
              >
                GitHub Repository ↗
              </a>
            </li>
            <li>
              <a
                href={RELEASES_URL}
                className={styles['nav__mobile-cta']}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Download for Windows
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
