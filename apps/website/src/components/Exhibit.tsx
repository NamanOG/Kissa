import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Card, Frame } from './Room'
import { RevealHeading } from './ui/Reveal'
import { asset } from '../lib/asset'
import styles from './Chapter.module.css'

export interface ExhibitItem {
  id: string
  name: string
  text: string
  /** A short loop (mp4 with a webp poster) or a still with an 800px sibling, without extension. */
  media: string
  video?: boolean
  swatch?: string
}

const ADVANCE_MS = 6000

/** One room of the story: a card that chooses what the picture on the wall shows. */
export function Exhibit({
  id,
  active,
  title,
  lead,
  items,
  kind = 'walnut',
  children
}: {
  id: string
  active: boolean
  title: string[]
  lead?: string
  items: ExhibitItem[]
  kind?: 'walnut' | 'gilt' | 'lacquer'
  children?: ReactNode
}) {
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState(0)
  const [touched, setTouched] = useState(false)
  const clip = useRef<HTMLVideoElement>(null)
  const item = items[selected]

  useEffect(() => {
    if (reduced || touched || !active || items.length < 2) return
    const timer = window.setTimeout(() => setSelected((i) => (i + 1) % items.length), ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [selected, reduced, touched, active, items.length])

  useEffect(() => {
    const video = clip.current
    if (!video) return
    if (active && !reduced) video.play().catch(() => {})
    else video.pause()
  }, [active, reduced, selected])

  const poster = item.video ? asset(`${item.media}.webp`) : asset(`${item.media}-800.webp`)

  return (
    <div className={styles.layout}>
      <div className={styles.part} data-part="card">
        <Card>
          <RevealHeading id={`${id}-heading`} className={styles.title} lines={title} />
          {lead && <p className={styles.lead}>{lead}</p>}
          <div className={styles.choices} role="group" aria-label={`${title.join(' ').replaceAll('*', '')}: choose one`}>
            {items.map((entry, i) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={i === selected}
                onClick={() => {
                  setTouched(true)
                  setSelected(i)
                }}
              >
                {entry.swatch && <span style={{ background: entry.swatch }} aria-hidden="true" />}
                {entry.name}
              </button>
            ))}
          </div>
          <p className={styles.detail} aria-live="polite">
            {item.text}
          </p>
          {children}
        </Card>
      </div>

      <div className={`${styles.part} ${styles.picture}`} data-part="frame">
        <Frame kind={kind} caption={item.name}>
          <AnimatePresence initial={false}>
            <motion.div
              key={item.id}
              className={styles.media}
              initial={{ opacity: 0, scale: reduced ? 1 : 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              {item.video ? (
                <video
                  ref={clip}
                  src={active ? asset(`${item.media}.mp4`) : undefined}
                  poster={poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  disablePictureInPicture
                  aria-label={`Kissa, ${item.name}: ${item.text}`}
                  width={1280}
                  height={720}
                />
              ) : (
                <img
                  src={poster}
                  srcSet={`${poster} 800w, ${asset(`${item.media}.webp`)} 1600w`}
                  sizes="(max-width: 1040px) 92vw, 56vw"
                  alt={`Kissa, ${item.name}: ${item.text}`}
                  width={1600}
                  height={900}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Frame>
      </div>
    </div>
  )
}
