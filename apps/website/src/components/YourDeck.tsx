import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import styles from './YourDeck.module.css'
import { RevealHeading } from './ui/Reveal'
import { asset } from '../lib/asset'

const PANELS = [
  {
    clip: 'moving-light',
    label: 'Moving light',
    title: 'The cover’s colours, drifting.',
    text: 'Turn on Moving light and the colours of the album that is playing drift slowly behind the room while the music plays. Let them move with the beat, turn the room light down, or set a sleep timer.'
  },
  {
    clip: 'editions',
    label: 'Your turntable',
    title: 'Walnut, Porcelain or Studio Silver.',
    text: 'Choose a finish, then a record: classic black, a colour, marble, tortoiseshell or splatter, or one pressed in the colours of the album. Save the looks you like.'
  }
]

/** One muted loop that plays only while it can be seen. */
function Loop({ clip, label }: { clip: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reduced) video.play().catch(() => {})
      else video.pause()
    })
    observer.observe(video)
    return () => observer.disconnect()
  }, [reduced])
  return (
    <video
      ref={ref}
      className={styles.clip}
      src={asset(`media/deck/${clip}.mp4`)}
      poster={asset(`media/deck/${clip}.webp`)}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-label={`Kissa vinyl player: ${label}`}
      width={1280}
      height={720}
    />
  )
}

/**
 * YourDeck - the two things people change most, shown rather than listed: Moving light and the
 * turntable's finishes and pressings. Each is a short muted loop recorded from the app.
 */
export function YourDeck() {
  return (
    <section id="your-deck" className={styles.section} aria-labelledby="your-deck-heading">
      <div className="container">
        <header className={styles.header}>
          <span className="label">Make it yours</span>
          <RevealHeading id="your-deck-heading" className="section-title" lines={['A deck that', '*takes after the record.*']} />
        </header>
        <div className={styles.grid}>
          {PANELS.map((p) => (
            <figure key={p.clip} className={styles.panel}>
              <div className={styles.frame}>
                <Loop clip={p.clip} label={p.label} />
              </div>
              <figcaption className={styles.caption}>
                <span className="label">{p.label}</span>
                <h3 className={styles.title}>{p.title}</h3>
                <p>{p.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
