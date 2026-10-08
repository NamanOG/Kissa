import styles from './SiteFooter.module.css'
import { ArrowOut } from './ui/Marks'
import { GITHUB_URL } from '../lib/links'

const LINKS = [
  { label: 'GitHub', href: GITHUB_URL },
  { label: 'Issues', href: `${GITHUB_URL}/issues` },
  { label: 'License', href: `${GITHUB_URL}/blob/main/LICENSE` },
  { label: 'Privacy', href: `${GITHUB_URL}/blob/main/PRIVACY.md` },
  { label: '@NamanOG', href: 'https://github.com/NamanOG' }
]

/** GlyphCode's mark, from the studio's own brand files. */
function GlyphCodeMark() {
  return (
    <svg viewBox="-8 -13 154 154" aria-hidden="true">
      <g fill="none" strokeWidth="18">
        <path stroke="#121211" d="M12 40a28 28 0 1 0 56 0a28 28 0 1 0 -56 0" />
        <path stroke="#121211" d="M68 92A28 28 0 0 1 12 92" />
        <path stroke="#121211" d="M116.81 21.26A28 28 0 1 0 116.81 58.74" />
        <path stroke="#2F3BFF" d="M68 5.5V92" />
      </g>
      <circle fill="#E39A12" cx="128" cy="70" r="9" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.row}>
          <span>
            &copy; {new Date().getFullYear()} Naman Bagdiya, GlyphCode
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
        <div className={styles.studio}>
          <span className="label">Developed by</span>
          <a
            href="https://www.glyphcode.studio/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.studioLink}
            aria-label="GlyphCode, the studio behind Kissa (opens in a new tab)"
          >
            <span className={styles.studioMark}>
              <GlyphCodeMark />
            </span>
            glyphcode
            <ArrowOut />
          </a>
        </div>
        <p className={styles.legal}>
          Plays along with Spotify, Apple Music, TIDAL and local media players, which are trademarks of their
          respective owners.
        </p>
      </div>
    </footer>
  )
}
