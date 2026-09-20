import styles from './SiteFooter.module.css'

const GITHUB_URL = 'https://github.com/NamanOG/Kissa'
const RELEASES_URL = 'https://github.com/NamanOG/Kissa/releases/latest'
const ISSUES_URL = 'https://github.com/NamanOG/Kissa/issues'
const AUTHOR_URL = 'https://github.com/NamanOG'
const PRODUCT_VERSION = '4.1.1'

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footer__inner}`}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div className={styles.brand}>
              <img src="/kissa_logo.png" alt="" width={24} height={24} className={styles.logo} aria-hidden="true" />
              <span className={styles.wordmark}>Kissa</span>
              <span className={styles.version}>v{PRODUCT_VERSION}</span>
            </div>
            <p className={styles.brandDesc}>
              A contemplative desktop vinyl player and listening companion for Windows 10 &amp; 11.
              Crafted with tactile reverence for physical sound.
            </p>
          </div>

          <div className={styles.linksCol}>
            <div className={styles.colTitle}>EXPLORE</div>
            <ul className={styles.linkList} role="list">
              <li><a href="#showcase" className={styles.link}>Experience Modes</a></li>
              <li><a href="#demo" className={styles.link}>In Motion</a></li>
              <li><a href="#environments" className={styles.link}>Listening Rooms</a></li>
              <li><a href="#about" className={styles.link}>Creator Statement</a></li>
              <li><a href="#download" className={styles.link}>Download</a></li>
            </ul>
          </div>

          <div className={styles.linksCol}>
            <div className={styles.colTitle}>PROJECT</div>
            <ul className={styles.linkList} role="list">
              <li>
                <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Download Installer (v{PRODUCT_VERSION}) ↗
                </a>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  GitHub Repository ↗
                </a>
              </li>
              <li>
                <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Report an Issue ↗
                </a>
              </li>
              <li>
                <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Open Source License ↗
                </a>
              </li>
              <li>
                <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Creator (@NamanOG) ↗
                </a>
              </li>
            </ul>
          </div>

          <div className={styles.linksCol}>
            <div className={styles.colTitle}>COMPATIBILITY</div>
            <ul className={styles.linkList} role="list">
              <li className={styles.infoText}>Windows 10 &amp; 11</li>
              <li className={styles.infoText}>Spotify for Windows</li>
              <li className={styles.infoText}>Apple Music for Windows</li>
              <li className={styles.infoText}>TIDAL for Windows</li>
              <li className={styles.infoText}>Local Media Players</li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.copy}>
            &copy; {new Date().getFullYear()} Kissa. Built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
              Naman Bagdiya
            </a>{' '}
            (GlyphCode). Free &amp; Open Source.
          </div>
          <div className={styles.bottomMeta}>
            <span>Spotify, Apple Music, and TIDAL are trademarks of their respective owners.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
