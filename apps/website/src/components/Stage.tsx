import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { heroScenes } from '@reserve'
import { Ambient } from './Ambient'
import { Deck } from './Deck'
import { RevealHeading } from './ui/Reveal'
import { DownloadButton } from './ui/DownloadButton'
import styles from './Stage.module.css'

const SCENE_SECONDS = 10

/** The first room: a painting, the turntable standing in it, and the menu card on the wall. */
export function HeroChapter({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const scene = heroScenes[index]

  useEffect(() => {
    if (reduced || held || !active || heroScenes.length < 2) return
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % heroScenes.length), SCENE_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [index, reduced, held, active])

  return (
    <div className={styles.stage}>
      <div className={styles.painting} data-part="art" aria-hidden="true">
        <AnimatePresence initial={false}>
          {scene && (
            <motion.div
              key={scene.art}
              className={styles.layer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.15 : 1.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <img src={scene.art} alt="" width={1536} height={1024} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />
              {active && <Ambient kind={scene.ambient} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.cardSlot} data-part="card">
        <div className={styles.card}>
          <span className={styles.pin} aria-hidden="true" />
          <span className={styles.seal} lang="ja" aria-hidden="true">喫茶</span>
          <RevealHeading as="h1" trigger="mount" delay={0.15} className={styles.title} lines={['Music,', 'made tangible.']} />
          <p className={styles.lead}>
            A free vinyl player for Windows 10 and 11. Whatever you play in Spotify, Apple Music, TIDAL or a local
            player becomes a record, turning quietly beside your work.
          </p>
          <DownloadButton showMeta />
          {heroScenes.length > 1 && (
            <div className={styles.picker} role="group" aria-label="Choose a room">
              {heroScenes.map((item, i) => (
                <button
                  key={item.art}
                  type="button"
                  aria-pressed={i === index}
                  onClick={() => {
                    setHeld(true)
                    setIndex(i)
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.deck} data-part="frame">
        <Deck finish={scene?.finish ?? 'original'} active={active} />
      </div>
    </div>
  )
}
