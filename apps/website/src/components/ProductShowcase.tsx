import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import styles from './ProductShowcase.module.css'
import { ProductMedia } from './ProductMedia'
import { FluidTabs, TabItem } from './ui/FluidTabs'
import { PointerGlow } from './ui/PointerGlow'

interface ProductMode {
  id: string
  number: string
  name: string
  tagline: string
  description: string
  slot: string
}

const MODES: ProductMode[] = [
  {
    id: 'normal',
    number: '01',
    name: 'Normal Window',
    tagline: 'Your music, close at hand.',
    description:
      'A dedicated vinyl deck that sits comfortably beside your code, writing, or browser. Watch the platter spin with real tonearm physics, seek by dropping the needle, and stay close to what is playing.',
    slot: 'product-main-window.png'
  },
  {
    id: 'fullscreen',
    number: '02',
    name: 'Fullscreen Room',
    tagline: 'Let the room become the listening experience.',
    description:
      'All desktop clutter fades away. Your screen transforms into an intimate, warm listening space with a gently lit turntable, calm atmospheric shadows, and a quiet clock.',
    slot: 'product-fullscreen.png'
  },
  {
    id: 'lyrics',
    number: '03',
    name: 'Fullscreen with Lyrics',
    tagline: 'Stay with every line.',
    description:
      'High-contrast, time-synchronized typography flows alongside the record. Click any line to travel directly to that moment in the music.',
    slot: 'product-fullscreen-lyrics.png'
  },
  {
    id: 'screensaver',
    number: '04',
    name: 'Windows Screensaver',
    tagline: 'Let the music remain when the desk goes quiet.',
    description:
      'When your PC rests, Kissa seamlessly steps forward as a living album screensaver—keeping the record spinning and lyrics moving while you step away.',
    slot: 'product-screensaver.png'
  },
  {
    id: 'screensaver-lyrics',
    number: '05',
    name: 'Screensaver with Lyrics',
    tagline: 'Words that stay with you when the desk goes still.',
    description:
      'The living screensaver, now with synchronized lyrics. Every line flows in time with the record—an intimate reading of the music while your room rests.',
    slot: 'product-screensaver-lyrics.png'
  },
  {
    id: 'shelf',
    number: '06',
    name: 'Record Shelf',
    tagline: 'Keep your listening collection within reach.',
    description:
      'Browse your recent listening history as a physical crate of vinyl records. Flip through jacket sleeves, inspect artwork, and revisit past sessions anytime.',
    slot: 'product-record-shelf.png'
  }
]

const TABS: TabItem[] = MODES.map((m) => ({
  id: m.id,
  label: m.name
}))

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState('normal')

  const activeMode = MODES.find((m) => m.id === activeTab) || MODES[0]

  return (
    <section id="showcase" className={styles.section} aria-labelledby="showcase-heading">
      <div className="container">
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.eyebrow}>EXPERIENCE</span>
            <h2 id="showcase-heading" className={styles.title}>
              Six ways to experience your records.
            </h2>
            <p className={styles.lead}>
              Kissa adapts to how you listen: from a quiet companion window beside your work, to an immersive room
              screensaver when your desk goes quiet.
            </p>
          </div>

          <div className={styles.tabBar}>
            <FluidTabs
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              layoutId="product-mode-tabs"
            />
          </div>
        </div>

        <div
          id={`panel-${activeMode.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeMode.id}`}
          className={styles.stage}
        >
          <PointerGlow color="rgba(224, 142, 69, 0.08)" size={500}>
            <div className={styles.stageCanvas}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMode.id}
                  initial={{ opacity: 0, scale: 0.995 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.995 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={styles.mediaMotionWrapper}
                >
                  <ProductMedia
                    slot={activeMode.slot}
                    alt={`${activeMode.name} - ${activeMode.tagline}`}
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </PointerGlow>

          <div className={styles.modeNarrative}>
            <div className={styles.narrativeLeft}>
              <span className={styles.modeNumber}>MODE {activeMode.number}</span>
              <h3 className={styles.modeName}>{activeMode.name}</h3>
            </div>
            <div className={styles.narrativeRight}>
              <p className={styles.modeTagline}>{activeMode.tagline}</p>
              <p className={styles.modeDesc}>{activeMode.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
