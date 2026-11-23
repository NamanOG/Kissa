import { useEffect, useState } from 'react'
import { ReserveSection } from '@reserve'
import styles from './SiteNav.module.css'
import { DownloadButton } from './ui/DownloadButton'
import { brandMark } from '../lib/brandMark'

const NAV_ITEMS = [
  { label: 'Listen', id: 'listen' },
  { label: 'Modes', id: 'modes' },
  { label: 'Rooms', id: 'rooms' },
  { label: 'Focus', id: 'study' },
  ...(ReserveSection ? [{ label: 'Reserve', id: 'reserve' }] : []),
  { label: 'Features', id: 'notes' }
]

/** A strip of label paper across the top. The section being read gets a small turning record. */
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
    document.querySelectorAll('main section[id], main [data-nav]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <header className={styles.nav}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <nav className={styles.bar} aria-label="Main">
        <a href="#top" className={styles.brand} aria-label="Kissa, back to top">
          <img {...brandMark(import.meta.env.BASE_URL, 28)} alt="" width={28} height={28} className={styles.logo} />
          <span className={styles.wordmark}>Kissa</span>
          <span className={styles.jp} lang="ja" aria-hidden="true">喫茶</span>
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
