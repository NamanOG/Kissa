import styles from './SiteFooter.module.css'
import { GITHUB_URL, useLatestRelease } from '../hooks/useLatestRelease'

const LINKS = [
  { label: 'GitHub', href: GITHUB_URL },
  { label: 'Issues', href: `${GITHUB_URL}/issues` },
  { label: 'License', href: `${GITHUB_URL}/blob/main/LICENSE` },
  { label: 'Privacy', href: `${GITHUB_URL}/blob/main/PRIVACY.md` },
  { label: '@NamanOG', href: 'https://github.com/NamanOG' }
]

export function SiteFooter() {
  const release = useLatestRelease()

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.row}>
          <span>
            &copy; {new Date().getFullYear()} Naman Bagdiya, GlyphCode
            &middot; v{release.version}
          </span>
          <ul className={styles.links} role="list">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.legal}>
          Plays along with Spotify, Apple Music, TIDAL and local media players, which are trademarks of their
          respective owners.
        </p>
      </div>
    </footer>
  )
}
