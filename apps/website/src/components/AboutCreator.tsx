import styles from './AboutCreator.module.css'

const GITHUB_URL = 'https://github.com/NamanOG/Kissa'
const AUTHOR_URL = 'https://github.com/NamanOG'

export function AboutCreator() {
  return (
    <section id="about" className={styles.section} aria-labelledby="creator-heading">
      <div className="container">
        <div className={styles.layout}>
          <div className={styles.leadHeader}>
            <span className={styles.eyebrow}>THE CRAFT &bull; SLOW LISTENING</span>
            <h2 id="creator-heading" className={styles.title}>
              Music was never meant to be background noise.
            </h2>
          </div>

          <blockquote className={styles.pullQuote}>
            &ldquo;In a jazz kissa, you sit with the record, observe the turntable turn, and listen with intention.
            Kissa was built to restore that quiet, tactile presence to our modern screens.&rdquo;
          </blockquote>

          <div className={styles.narrativeGrid}>
            <div className={styles.column}>
              <p>
                We spend hours in front of glass displays, streaming infinite playlists that vanish the moment they
                finish playing. The physical ritual of music—taking an album from the shelf, holding the sleeve,
                placing the stylus into the groove—has been largely replaced by frictionless consumption.
              </p>
              <p>
                Kissa is an independent exploration in slow listening, designed by an artist and developer who missed
                the feeling of physical albums.
              </p>
            </div>

            <div className={styles.column}>
              <p>
                It runs quietly alongside Spotify, Apple Music, TIDAL, or your local library, translating whatever is
                playing into a contemplative desktop companion: the calibrated rotation of the platter, the sweep of
                the tonearm, synchronized lyrics, and ambient listening rooms that calm your desk.
              </p>
              <p>
                No feeds, no algorithmic recommendations, and no distractions. Just your music, given the visual
                reverence it deserves.
              </p>
            </div>
          </div>

          <div className={styles.signoff}>
            <div className={styles.authorBlock}>
              <span className={styles.authorName}>Naman Bagdiya</span>
              <span className={styles.authorTitle}>Designer &amp; Developer &bull; GlyphCode</span>
            </div>

            <div className={styles.links}>
              <a
                href={GITHUB_URL}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Kissa repository on GitHub (opens in new tab)"
              >
                Source Code on GitHub ↗
              </a>
              <span className={styles.linkDivider} aria-hidden="true">&bull;</span>
              <a
                href={AUTHOR_URL}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Naman Bagdiya on GitHub (opens in new tab)"
              >
                @NamanOG ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
