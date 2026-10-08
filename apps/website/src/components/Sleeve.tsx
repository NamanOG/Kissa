import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import styles from './Sleeve.module.css'
import { RevealHeading } from './ui/Reveal'
import { Vinyl } from './ui/Vinyl'
import { ArrowOut, SideMark } from './ui/Marks'
import { GITHUB_URL } from '../lib/links'

const AUTHOR_URL = 'https://github.com/NamanOG'

const SIDES = [
  {
    name: 'Side A',
    title: 'The deck',
    tracks: [
      { no: 'A1', name: 'Tonearm seeking', note: 'Drag the needle across the groove to move through the track.' },
      { no: 'A2', name: '33⅓ and 45', note: 'Two speeds, with real spin-up and coast-down.' },
      { no: 'A3', name: 'Synced lyrics', note: 'Line by line, and word by word where the source allows.' },
      { no: 'A4', name: 'Match Album', note: 'Room light drawn from the colours of the current cover.' }
    ]
  },
  {
    name: 'Side B',
    title: 'The room',
    tracks: [
      { no: 'B1', name: 'Listening Display', note: 'Fullscreen, as a turntable or a 12-inch cover on a stand.' },
      { no: 'B2', name: 'Screensaver', note: 'A native Windows screensaver that keeps the record turning.' },
      { no: 'B3', name: 'Record Shelf', note: 'Your listening history, kept as a crate of sleeves.' },
      { no: 'B4', name: 'Quiet by default', note: 'Lives in the system tray, and updates only when you say so.' }
    ]
  }
]

/**
 * Sleeve - the feature list as the back of an LP: two sides, eight tracks.
 * As the section scrolls in, the record slides out of its sleeve.
 */
export function Sleeve() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'center 45%'] })
  const pull = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  const x = useTransform(pull, [0, 1], ['2%', '54%'])
  const rotate = useTransform(pull, [0, 1], [-70, 0])

  return (
    <section ref={ref} id="notes" className={styles.section} aria-labelledby="sleeve-heading">
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className={styles.label}>Liner notes</span>
          <RevealHeading id="sleeve-heading" className={styles.title} lines={['What’s on', 'the record.']} />
        </header>

        <div className={styles.layout}>
          <div className={styles.pack} aria-hidden="true">
            <motion.div className={styles.record} style={reduced ? { x: '54%' } : { x, rotate }}>
              <Vinyl />
            </motion.div>
            <div className={styles.jacket}>
              <span className={styles.jacketTop}>Kissa</span>
              <span lang="ja" className={styles.glyph}>
                喫茶
              </span>
              <span className={styles.jacketBottom}>
                <span>Stereo</span>
                <span>33⅓ RPM</span>
              </span>
            </div>
          </div>

          <div className={styles.sides}>
            {SIDES.map((side) => (
              <section key={side.name} className={styles.side} aria-label={`${side.name}: ${side.title}`}>
                <h3 className={styles.sideHead}>
                  <span className={styles.sideName}>
                    <SideMark side={side.name.endsWith('A') ? 'A' : 'B'} />
                    {side.name}
                  </span>
                  <span>{side.title}</span>
                </h3>
                <ol className={styles.tracks} role="list">
                  {side.tracks.map((t) => (
                    <li key={t.no} className={styles.track}>
                      <span className={styles.no}>{t.no}</span>
                      <span className={styles.name}>{t.name}</span>
                      <span className={styles.note}>{t.note}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <p className={styles.credits}>
              <span>
                Designed and built by <strong>Naman Bagdiya</strong>, GlyphCode.
              </span>
              <span className={styles.links}>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  Source
              <ArrowOut />
                </a>
                <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
                  @NamanOG
              <ArrowOut />
                </a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
