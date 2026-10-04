import { useEffect, useState } from 'react'
import styles from './SiteNav.module.css'
import { DownloadButton } from './ui/DownloadButton'
import { asset } from '../lib/asset'

const NAV_ITEMS = [
  { label: 'Modes', id: 'modes' },
  { label: 'Demo', id: 'demo' },
  { label: 'Rooms', id: 'rooms' },
  { label: 'Features', id: 'notes' }
]

/**
 * A plain floating bar: brand, four links, download. The one flourish is the
 * marker for the section being read — a tiny record that drops in beside the
 * label and spins, the way the deck shows what is playing.
 */
export function SiteNav() {
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    )
    document.querySelectorAll('main > section').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <header className={styles.nav}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <nav className={styles.bar} aria-label="Main">
        <a href="#top" className={styles.brand} aria-label="Kissa, back to top">
          <img src={asset('media/kissa-logo-256.webp')} alt="" width={26} height={26} className={styles.logo} />
          <span className={styles.wordmark}>Kissa</span>
        </a>

        <ul className={styles.links} role="list">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id
            return (
              <li key={item.id}>
                <a href={`#${item.id}`} className={styles.link} aria-current={active ? 'true' : undefined}>
                  <span className={styles.disc} aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>

        <DownloadButton size="sm" />
      </nav>
    </header>
  )
}
