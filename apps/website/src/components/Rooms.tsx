import { useState } from 'react'
import styles from './Rooms.module.css'
import { RevealHeading } from './ui/Reveal'
import { LISTENING_ROOMS } from '../data/rooms'
import { asset } from '../lib/asset'

/** Match Album is not a fixed room: it takes its light from the cover that is playing. */
const MATCH_ALBUM = {
  id: 'match-album',
  number: '09',
  name: 'Match Album',
  description: 'No fixed room. The light is drawn from the colours of the cover on the platter.',
  lightingMood: 'Lit by the cover',
  image: 'media/rooms/room-match-album',
  accentColor: '#d946a8'
}

const ROOMS = [...LISTENING_ROOMS, MATCH_ALBUM]

/**
 * Rooms - pick a room and the app is shown in it. Every picture is the same
 * window on the same record, so the only thing that changes is the light.
 */
export function Rooms() {
  const [active, setActive] = useState(0)
  const room = ROOMS[active]

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
            {ROOMS.map((r, i) => (
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

          <figure className={styles.viewer}>
            <div className={styles.frame}>
              {ROOMS.map((r, i) => (
                <img
                  key={r.id}
                  src={asset(`${r.image}-800.webp`)}
                  srcSet={`${asset(`${r.image}-800.webp`)} 800w, ${asset(`${r.image}.webp`)} 1600w`}
                  sizes="(max-width: 860px) 92vw, 720px"
                  alt={`Kissa in the ${r.name} room: ${r.description}`}
                  aria-hidden={i === active ? undefined : true}
                  width={1600}
                  height={900}
                  loading="lazy"
                  className={`${styles.shot} ${i === active ? styles.shotActive : ''}`}
                />
              ))}
            </div>

            <figcaption className={styles.caption}>
              <span aria-live="polite">{room.description}</span>
              <span className="label">
                {room.number} / 0{ROOMS.length}
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
