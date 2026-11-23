import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import styles from './Sleeve.module.css'
import { RevealHeading } from './ui/Reveal'
import { Vinyl } from './ui/Vinyl'
import { SideMark } from './ui/Marks'

const SIDES = [
  {
    name: 'Side A',
    title: 'The deck',
    tracks: [
      { no: 'A1', name: 'Tonearm seeking', note: 'Drag the needle to move through the track. The arm sets down at the edge and travels inwards as it plays.' },
      { no: 'A2', name: '33⅓ and 45', note: 'Two speeds, with real spin-up and coast-down.' },
      { no: 'A3', name: 'Synced lyrics', note: 'Line by line, word by word where the source allows, and over your other windows if you like.' },
      { no: 'A4', name: 'Your turntable', note: 'Walnut, Porcelain or Studio Silver, with coloured and marbled pressings. Save the looks you like.' },
      { no: 'A5', name: 'Match the Album', note: 'An optional record pressed in the colours of the cover. Classic black stays the default.' },
      { no: 'A6', name: 'Real turntable sounds', note: 'Recorded needle drops and soft mechanical keys. One switch turns them off.' },
      { no: 'A7', name: 'Your albums', note: 'Play your own album folders with the Kissa Hi-Fi vinyl sound.' },
      { no: 'A8', name: 'Dust lid and record sides', note: 'Lift the dust lid, turn the record over and read the sleeve back.' },
      { no: 'A9', name: 'Your music library', note: 'Add your music folders and your albums line the Shelf. MP3, FLAC, AAC, Ogg, Opus and WAV.' },
      { no: 'A10', name: 'Gapless and crossfade', note: 'Albums play as pressed. Records from different albums crossfade for up to 12 seconds, with even loudness.' },
      { no: 'A11', name: 'Its own window buttons', note: 'Minimise, maximise and close in a small glass capsule, made for the room.' }
    ]
  },
  {
    name: 'Side B',
    title: 'The room',
    tracks: [
      { no: 'B1', name: 'Match Album light', note: 'The room is lit by the colours of the current cover.' },
      { no: 'B2', name: 'Moving light', note: 'The cover’s colours drift behind the room, and can move with the beat: gently, balanced or lively.' },
      { no: 'B3', name: 'Listening Display', note: 'Press D for fullscreen, as a turntable or a 12-inch cover on a stand.' },
      { no: 'B4', name: 'Screensaver', note: 'A native Windows screensaver that keeps the record turning.' },
      { no: 'B5', name: 'Record Shelf', note: 'Your listening history: flip through the crate, or see it as a grid.' },
      { no: 'B6', name: 'Quiet by default', note: 'Lives in the system tray, and updates through the Microsoft Store.' },
      { no: 'B7', name: 'Pressed', note: 'Your week, month or year in music, told as a short moving story with a card to share. Stays on your PC.' },
      { no: 'B8', name: 'Phone remote', note: 'Control Kissa from your phone on the same Wi-Fi. Scan a QR code or enter a 6-digit code. No account.' },
      { no: 'B9', name: 'English and Spanish', note: 'Use Kissa in English or Spanish.' },
      { no: 'B10', name: 'Comfort', note: 'Reduce motion and increase contrast. Each follows Windows until you choose.' },
      { no: 'B11', name: 'Sessions', note: 'A page for every day you listen: records played, albums heard whole, lines you kept and a note of your own.' },
      { no: 'B12', name: 'Find anything', note: 'Ctrl+K searches records, rooms, days and actions from anywhere in the room.' },
      { no: 'B13', name: 'Discover Kissa', note: 'A short walkthrough of what the app can do, with a button that tries each thing.' }
    ]
  },
  {
    name: 'Side C',
    title: 'The Focus Room',
    tracks: [
      { no: 'C1', name: 'Real recordings', note: 'Rain, snow, a forest stream, crickets at night and a crackling fire, as loud or as quiet as you like.' },
      { no: 'C2', name: 'Focus sessions and breaks', note: '25, 50 or 90 minutes, or an open session. After sleep or a long absence, choose to resume or finish.' },
      { no: 'C3', name: 'Small steps', note: 'Write what you are working on, break it into steps, and park stray thoughts for later.' },
      { no: 'C4', name: 'Your week', note: 'A daily goal, a quiet line of the last seven days, and a streak when you keep it.' },
      { no: 'C5', name: 'On Discord, if you like', note: 'Show "Focusing · Rain room" with a timer. What you are working on stays private.' }
    ]
  }
]

/** The feature list as the back of an LP. Choose a track and its note appears beside the record. */
export function Sleeve() {
  const reduced = useReducedMotion()
  const [picked, setPicked] = useState(SIDES[0].tracks[0])

  return (
    <section id="notes" className={`hour hour-paper ${styles.section}`} aria-labelledby="sleeve-heading">
      <div className={`container ${styles.inner}`}>
        <div>
          <RevealHeading id="sleeve-heading" className={styles.title} lines={['What\u2019s on', 'the record.']} />
          <div className={styles.pack} aria-hidden="true">
            <motion.div
              className={styles.record}
              initial={reduced ? { x: '40%' } : { x: '2%', rotate: -70 }}
              whileInView={{ x: '40%', rotate: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            >
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
          <div className={styles.note} aria-live="polite">
            <h3>{picked.name}</h3>
            <p>{picked.note}</p>
          </div>
          <p className={styles.credits}>
            Designed and built by <strong>Naman Bagdiya</strong>, GlyphCode.
          </p>
        </div>

        <div className={styles.sides}>
          {SIDES.map((side) => (
            <section key={side.name} className={styles.side} aria-label={`${side.name}: ${side.title}`}>
              <h3 className={styles.sideHead}>
                <span className={styles.sideName}>
                  <SideMark side={side.name.slice(-1) as 'A' | 'B' | 'C'} />
                  {side.name}
                </span>
                <span>{side.title}</span>
              </h3>
              <ol className={styles.tracks} role="list">
                {side.tracks.map((t) => (
                  <li key={t.no}>
                    <button
                      type="button"
                      className={styles.track}
                      aria-pressed={picked.no === t.no}
                      onMouseEnter={() => setPicked(t)}
                      onFocus={() => setPicked(t)}
                      onClick={() => setPicked(t)}
                    >
                      <span className={styles.no}>{t.no}</span>
                      <span className={styles.name}>{t.name}</span>
                      <span className="sr-only">{t.note}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
