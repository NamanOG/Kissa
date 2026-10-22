import { useState } from 'react'
import styles from './StudyRoom.module.css'
import { RevealHeading } from './ui/Reveal'
import { asset } from '../lib/asset'

const STUDY_ROOMS = [
  {
    id: 'rain',
    name: 'Rain',
    description: 'Rain on a garden under the eaves. The glass mists over as you focus.'
  },
  {
    id: 'snow',
    name: 'Snow',
    description: 'A quiet pine forest in falling snow. Frost gathers as the block runs.'
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Light through the leaves, warming from morning towards midday.'
  },
  {
    id: 'night',
    name: 'Night',
    description: 'A still lake at blue hour. The stars come out while you work.'
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    description: 'A cabin hearth whose flames move and throw the odd spark.'
  }
]

const FEATURES = [
  {
    name: 'Real recordings',
    text: 'Each room has its own field recording: rain, snow, a forest stream, crickets at night, a crackling fire. Set it as loud or as quiet as you like.'
  },
  {
    name: 'Focus sessions and breaks',
    text: 'Choose 25, 50 or 90 minutes, or an open session, with breaks between. After sleep or a long absence, choose whether to resume or finish.'
  },
  {
    name: 'Small steps',
    text: 'Write what you are working on, break it into steps, and park stray thoughts for later.'
  },
  {
    name: 'Your week',
    text: 'A daily goal, a quiet line of the last seven days, and a streak when you keep it.'
  },
  {
    name: 'On Discord, if you like',
    text: 'Show "Focusing · Rain room" with a timer on your profile. What you are working on stays private.'
  }
]

/**
 * Study Room - the fullscreen room from the app, shown in each of its five rooms. The
 * pictures are the app itself, so switching rooms here is what switching rooms there does.
 */
export function StudyRoom() {
  const [active, setActive] = useState(0)
  const room = STUDY_ROOMS[active]

  return (
    <section id="study" className={styles.section} aria-labelledby="study-heading">
      <div className="container">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className="label">The Focus Room</span>
            <RevealHeading
              id="study-heading"
              className="section-title"
              lines={['A room to work in,', '*the record still turning.*']}
            />
          </div>
          <p className="lead">
            Settle in for studying, writing, or whatever needs your attention. Kissa opens into a full-window
            room: a real view, its own sound, a focus session clock and your music on the record beside you.
          </p>
        </header>

        <figure className={styles.viewer}>
          <div className={styles.frame}>
            {STUDY_ROOMS.map((r, i) => (
              <img
                key={r.id}
                src={asset(`media/study/study-${r.id}-800.webp`)}
                srcSet={`${asset(`media/study/study-${r.id}-800.webp`)} 800w, ${asset(`media/study/study-${r.id}.webp`)} 1600w`}
                sizes="(max-width: 860px) 92vw, 1100px"
                alt={`The Kissa Focus Room in the ${r.name} room: ${r.description}`}
                aria-hidden={i === active ? undefined : true}
                width={1600}
                height={900}
                loading="lazy"
                className={`${styles.shot} ${i === active ? styles.shotActive : ''}`}
              />
            ))}
          </div>

          <figcaption className={styles.controls}>
            <div className={styles.tabs} role="group" aria-label="Focus Room views">
              {STUDY_ROOMS.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.tab} ${i === active ? styles.tabActive : ''}`}
                  aria-pressed={i === active}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <span className={styles.caption} aria-live="polite">
              {room.description}
            </span>
          </figcaption>
        </figure>

        <ol className={styles.features} role="list">
          {FEATURES.map((f, i) => (
            <li key={f.name} className={styles.feature}>
              <span className="label">0{i + 1}</span>
              <h3 className={styles.featureName}>{f.name}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ol>
        <p className="guide-home-link"><a href={asset('study-room/')}>Step inside the Focus Room →</a></p>
      </div>
    </section>
  )
}
