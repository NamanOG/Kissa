import { useState } from 'react'
import styles from './Rooms.module.css'
import { RevealHeading } from './ui/Reveal'
import { Vinyl } from './ui/Vinyl'
import { Tonearm } from './ui/Tonearm'
import { LISTENING_ROOMS } from '../data/rooms'
import { asset } from '../lib/asset'

/**
 * Rooms — pick a room and the deck is re-lit the way the app does it.
 * The wall light, faceplate, text and accent colours come straight from the
 * desktop app's theme definitions (see scripts/sync-rooms.py), so this is a
 * live preview rather than a picture of one.
 */
export function Rooms() {
  const [active, setActive] = useState(0)
  const room = LISTENING_ROOMS[active]

  const roomVars = {
    '--room-accent': room.accentColor,
    '--room-ink': room.inkColor,
    '--room-muted': room.mutedColor,
    '--room-plinth': room.plinthColor,
    '--room-plinth-border': room.plinthBorder
  } as React.CSSProperties

  return (
    <section id="rooms" className={styles.section} aria-labelledby="rooms-heading">
      <div className="container">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className="label">Eight rooms</span>
            <RevealHeading
              id="rooms-heading"
              className="section-title"
              lines={['Pick a room', '*to listen in.*']}
            />
          </div>
          <p className="lead">
            Each listening room re-lights the deck to suit the hour, the weather or the record. Choose one and watch
            it change.
          </p>
        </header>

        <div className={styles.layout}>
          <ul className={styles.index} role="list">
            {LISTENING_ROOMS.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`${styles.row} ${i === active ? styles.rowActive : ''}`}
                  aria-pressed={i === active}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <span className={`label ${styles.number}`}>{r.number}</span>
                  <span className={styles.name}>{r.name}</span>
                  <span className={`label ${styles.mood}`}>
                    <span className={styles.dot} style={{ background: r.accentColor }} aria-hidden="true" />
                    {r.lightingMood}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <figure className={styles.viewer} style={roomVars}>
            <div
              className={styles.room}
              role="img"
              aria-label={`Kissa's deck in the ${room.name} room: ${room.description}`}
            >
              {LISTENING_ROOMS.map((r, i) => (
                <div
                  key={r.id}
                  className={`${styles.wall} ${i === active ? styles.wallActive : ''}`}
                  style={{ backgroundColor: r.wallColor, backgroundImage: r.light }}
                />
              ))}
              <div className={`${styles.vignette} ${room.isLight ? styles.vignetteLight : ''}`} />

              <div className={styles.plinth}>
                <div className={styles.record}>
                  <Vinyl spinning platter />
                  <Tonearm className={styles.tonearm} angle={29} />
                </div>
              </div>

              <div className={styles.readout}>
                <span className={styles.nowPlaying}>Now playing</span>
                <span className={styles.roomTitle}>{room.name}</span>
              </div>

              <div className={styles.photoFrame}>
                {LISTENING_ROOMS.map((r, i) => (
                  <img
                    key={r.id}
                    src={asset(`${r.image}-480.webp`)}
                    alt=""
                    width={480}
                    height={268}
                    loading="lazy"
                    className={`${styles.photo} ${i === active ? styles.photoActive : ''}`}
                  />
                ))}
              </div>
            </div>

            <figcaption className={styles.caption}>
              <span aria-live="polite">{room.description}</span>
              <span className="label">Live preview · the app&rsquo;s own lighting</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
