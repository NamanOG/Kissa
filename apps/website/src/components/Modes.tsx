import { useEffect, useRef, useState } from 'react'
import styles from './Modes.module.css'
import { RevealHeading } from './ui/Reveal'
import { asset } from '../lib/asset'

const MODES = [
  {
    id: 'normal',
    name: 'Normal Window',
    description:
      'A vinyl deck that sits beside your code, writing or browser. Watch the platter spin, and seek by dropping the needle.',
    image: 'product-main-window'
  },
  {
    id: 'fullscreen',
    name: 'Fullscreen Room',
    description: 'Desktop clutter fades away. A gently lit turntable and a quiet clock take the whole screen.',
    image: 'product-fullscreen'
  },
  {
    id: 'lyrics',
    name: 'Fullscreen Lyrics',
    description: 'Time-synced lyrics beside the record. Click any line to travel straight to that moment.',
    image: 'product-fullscreen-lyrics'
  },
  {
    id: 'screensaver',
    name: 'Screensaver',
    description: 'When your PC rests, Kissa steps forward as a living album screensaver, still spinning.',
    image: 'product-screensaver'
  },
  {
    id: 'screensaver-lyrics',
    name: 'Screensaver Lyrics',
    description: 'The screensaver, with lyrics flowing in time while the room rests.',
    image: 'product-screensaver-lyrics'
  },
  {
    id: 'shelf',
    name: 'Record Shelf',
    description: 'Recent listening kept as a crate of records. Flip through sleeves and revisit past sessions.',
    image: 'product-record-shelf'
  }
]

/**
 * Modes — the screenshot stays pinned while the list scrolls past it.
 * Whichever mode crosses the middle of the viewport is the one on screen.
 */
export function Modes() {
  const [active, setActive] = useState(0)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      // On small screens the pinned screenshot covers the top of the viewport,
      // so a mode becomes active once it clears that, not at the true middle.
      { rootMargin: window.matchMedia('(max-width: 860px)').matches ? '-62% 0px -38% 0px' : '-50% 0px -50% 0px' }
    )
    itemRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="modes" className={styles.section} aria-labelledby="modes-heading">
      <div className="container">
        <header className={styles.header}>
          <span className="label">Six modes</span>
          <RevealHeading
            id="modes-heading"
            className="section-title"
            lines={['Six ways to sit', '*with a record.*']}
          />
        </header>

        <div className={styles.layout}>
          <ol className={styles.list} role="list">
            {MODES.map((mode, i) => (
              <li
                key={mode.id}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                data-index={i}
                className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
              >
                <span className="label">0{i + 1}</span>
                <h3 className={styles.name}>{mode.name}</h3>
                <p className={styles.desc}>{mode.description}</p>
              </li>
            ))}
          </ol>

          <div className={styles.screen}>
            <div className={styles.frame}>
              {MODES.map((mode, i) => (
                <img
                  key={mode.id}
                  src={asset(`media/${mode.image}-960.webp`)}
                  srcSet={`${asset(`media/${mode.image}-960.webp`)} 960w, ${asset(`media/${mode.image}.webp`)} 1920w`}
                  sizes="(max-width: 860px) 92vw, 760px"
                  alt={`Kissa vinyl player for Windows, ${mode.name} mode: ${mode.description}`}
                  aria-hidden={i === active ? undefined : true}
                  width={1920}
                  height={1080}
                  loading="lazy"
                  className={`${styles.shot} ${i === active ? styles.shotActive : ''}`}
                />
              ))}
            </div>
            <div className={styles.caption} aria-hidden="true">
              <span className="label">
                0{active + 1} / 0{MODES.length}
              </span>
              <span className={styles.ticks}>
                {MODES.map((mode, i) => (
                  <span key={mode.id} className={i === active ? styles.tickOn : undefined} />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
