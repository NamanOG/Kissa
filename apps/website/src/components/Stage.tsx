import { useEffect, useRef, useState } from 'react'
import {
  animate,
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue
} from 'motion/react'
import styles from './Stage.module.css'
import { TangibleHeading } from './ui/TangibleHeading'
import { DownloadButton } from './ui/DownloadButton'
import { Vinyl } from './ui/Vinyl'
import { Tonearm, ARM_REST, ARM_OUTER_GROOVE, ARM_INNER_GROOVE } from './ui/Tonearm'
import { Seal } from './ui/Marks'

/* Scroll chapters: the hero, then four steps. Each owns a fifth of the scroll. */
const STEPS = 5
const range = (i: number): [number, number] => [i / STEPS, (i + 1) / STEPS]

/* The arm leaves its rest at CUE and the stylus lands at NEEDLE_DOWN. */
const CUE = 0.6
const NEEDLE_DOWN = 0.66
const TRACK_SECONDS = 318
const RPM_33 = (33 + 1 / 3) * (360 / 60000) // degrees per millisecond

/* How far along the side the page plays by its end, and the arm angle there. */
const ARM_END = ARM_OUTER_GROOVE + (ARM_INNER_GROOVE - ARM_OUTER_GROOVE) * 0.86
/* The tonearm's pivot, as a fraction of its box (115/160, 36/420). */
const PIVOT = { x: 0.71875, y: 0.08571 }

const SOURCES = ['Spotify', 'Apple Music', 'TIDAL', 'Local files']

const LYRICS = [
  'Sit with the record.',
  'Watch it turn.',
  'Let the room go quiet.',
  'Listen with intention.',
  'Stay for the last track.',
  'Then turn it over.'
]

/** A closed ring that wobbles like a waveform - Kissa reading the session. */
const LISTEN_RING = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 360; i += 2) {
    const t = (i * Math.PI) / 180
    const envelope = 0.5 + 0.5 * Math.sin(t * 3 + 1)
    const r = 76 + Math.sin(t * 20) * 5 * envelope
    pts.push(`${(200 + r * Math.cos(t)).toFixed(2)} ${(200 + r * Math.sin(t)).toFixed(2)}`)
  }
  return `M ${pts.join(' L ')} Z`
})()

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

interface ChapterProps {
  progress: MotionValue<number>
  index: number
  active: boolean
  className?: string
  children: React.ReactNode
}

/** One layer of copy that fades in for its fifth of the scroll, then out. */
function Chapter({ progress, index, active, className = '', children }: ChapterProps) {
  const [a, b] = range(index)
  const first = index === 0
  const last = index === STEPS - 1
  const fade = 0.045

  const stops = first ? [b - fade, b] : last ? [a, a + fade] : [a, a + fade, b - fade, b]
  const opacity = useTransform(progress, stops, first ? [1, 0] : last ? [0, 1] : [0, 1, 1, 0])
  const y = useTransform(progress, stops, first ? [0, -28] : last ? [28, 0] : [28, 0, 0, -28])

  return (
    <motion.div
      className={`${styles.chapter} ${className}`}
      style={{ opacity, y }}
      data-active={active}
      aria-hidden={active ? undefined : true}
    >
      <div className={`container ${styles.chapterInner}`}>{children}</div>
    </motion.div>
  )
}

/**
 * Stage - the hero and the "how it works" story as one pinned scene.
 * The deck is the app's own record and tonearm, and scroll is the needle:
 * Kissa picks up what is playing, the arm cues and drops, and the page then
 * plays the side while the lyrics keep time.
 */
export function Stage() {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const spinRef = useRef<HTMLDivElement>(null)
  const armRef = useRef<HTMLDivElement>(null)
  const strobeRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState(0)
  const [source, setSource] = useState(0)
  const [lyric, setLyric] = useState(0)
  const [time, setTime] = useState('0:00')
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)')
    const update = () => setCompact(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })

  /* The deck starts large beside the headline, then settles for the story. */
  const intro = range(0)
  const scale = useTransform(progress, intro, compact ? [1.25, 1] : [1.15, 1])
  const x = useTransform(progress, intro, compact ? ['0%', '0%'] : ['5%', '0%'])
  const y = useTransform(progress, intro, compact ? ['160%', '0%'] : ['12%', '0%'])

  /* Step 2 - the listening ring draws itself around the label. */
  const listenLength = useTransform(progress, [0.4, 0.56], [0, 1])
  const listenOpacity = useTransform(progress, [0.39, 0.42, 0.58, 0.64], [0, 1, 1, 0])

  /* Steps 3–4 - cue across, drop, then track the side inward. */
  const armAngle = useTransform(
    progress,
    [0, CUE, NEEDLE_DOWN, 1],
    [ARM_REST, ARM_REST, ARM_OUTER_GROOVE, ARM_END]
  )
  const statusOpacity = useTransform(progress, [0.2, 0.25], [0, 1])

  /*
   * The arm normally follows scroll. It can also be picked up by hand, as in
   * the app: while held (and until the page has scrolled to where it was put
   * down) `held` overrides the scroll-driven angle.
   */
  const held = useRef<number | null>(null)
  const grip = useRef<{ pointerAngle: number; armAngle: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const renderArm = () => {
    const deg = held.current ?? armAngle.get()
    // Lifted (scaled up a touch, as the app does) until the stylus lands.
    const lift = grip.current ? 1.025 : held.current === null && progress.get() < NEEDLE_DOWN ? 1.015 : 1
    if (armRef.current) armRef.current.style.transform = `rotate(${deg}deg) scale(${lift})`
  }

  useMotionValueEvent(armAngle, 'change', (deg) => {
    // Hand the arm back to scroll once scrolling has caught up with it.
    if (held.current !== null && !grip.current && Math.abs(deg - held.current) < 0.6) held.current = null
    renderArm()
  })

  const pointerAngle = (e: React.PointerEvent) => {
    const box = armRef.current?.parentElement?.getBoundingClientRect()
    if (!box) return 0
    const px = box.left + box.width * PIVOT.x
    const py = box.top + box.height * PIVOT.y
    return (Math.atan2(e.clientY - py, e.clientX - px) * 180) / Math.PI
  }

  const onGrab = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const current = held.current ?? armAngle.get()
    grip.current = { pointerAngle: pointerAngle(e), armAngle: current }
    held.current = current
    setDragging(true)
    renderArm()
  }

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grip.current) return
    let delta = pointerAngle(e) - grip.current.pointerAngle
    while (delta > 180) delta -= 360
    while (delta < -180) delta += 360
    held.current = Math.max(-2, Math.min(ARM_INNER_GROOVE + 2, grip.current.armAngle + delta))
    renderArm()
  }

  const onRelease = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grip.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    grip.current = null
    setDragging(false)

    const section = sectionRef.current
    const dropped = held.current ?? ARM_REST
    if (!section) return

    // Put down on the record: the page seeks to that point in the side.
    // Put down short of it: the arm goes back to its rest, and so does the page.
    const onRecord = dropped >= ARM_OUTER_GROOVE - 8
    const target = onRecord ? Math.max(ARM_OUTER_GROOVE, Math.min(ARM_END, dropped)) : ARM_REST
    const seek = onRecord
      ? NEEDLE_DOWN + ((target - ARM_OUTER_GROOVE) / (ARM_END - ARM_OUTER_GROOVE)) * (1 - NEEDLE_DOWN)
      : Math.min(progress.get(), CUE - 0.04)

    animate(dropped, target, {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        held.current = v
        renderArm()
      },
      onComplete: () => {
        if (!onRecord && progress.get() < CUE) held.current = null
        renderArm()
      }
    })

    window.scrollTo({
      top: section.offsetTop + seek * (section.offsetHeight - window.innerHeight),
      behavior: reduced ? 'auto' : 'smooth'
    })
    // Safety net in case the scroll is interrupted before it catches up.
    window.setTimeout(() => {
      if (!grip.current) {
        held.current = null
        renderArm()
      }
    }, 2600)
  }

  useMotionValueEvent(progress, 'change', (v) => {
    setStep(Math.min(STEPS - 1, Math.max(0, Math.floor(v * STEPS + 0.02))))

    const [a1, b1] = range(1)
    setSource(Math.min(SOURCES.length - 1, Math.floor(clamp01((v - a1) / (b1 - a1)) * SOURCES.length)))

    setTime(formatTime(clamp01((v - NEEDLE_DOWN) / (1 - NEEDLE_DOWN)) * TRACK_SECONDS))

    const [a4, b4] = range(4)
    setLyric(Math.min(LYRICS.length - 1, Math.floor(clamp01((v - a4) / (b4 - a4 - 0.02)) * LYRICS.length)))
  })

  /* The platter spins up from rest when the page loads, then holds 33⅓. */
  const angle = useRef(0)
  const speed = useRef(0)
  const strobe = useRef(0)
  useAnimationFrame((_, delta) => {
    if (reduced) return
    speed.current += (RPM_33 - speed.current) * Math.min(1, 0.0022 * delta)
    angle.current = (angle.current + speed.current * delta) % 360
    if (spinRef.current) spinRef.current.style.transform = `rotate(${angle.current}deg)`

    // Stroboscope: the dots drift by the speed error, so they slide during
    // spin-up and lock still once the platter reaches exactly 33⅓.
    strobe.current = (strobe.current + (speed.current - RPM_33) * delta) % 360
    if (strobeRef.current) strobeRef.current.style.transform = `rotate(${strobe.current}deg)`
  })

  const status =
    step <= 1 ? (
      <>
        Now playing <i />
        <span className={styles.roll}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={SOURCES[source]}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {SOURCES[source]}
            </motion.span>
          </AnimatePresence>
        </span>
      </>
    ) : step === 2 ? (
      <>
        Following <i /> Windows media session
      </>
    ) : (
      <>
        <span className={styles.time}>{time}</span> / {formatTime(TRACK_SECONDS)} <i /> Following
      </>
    )

  return (
    <section ref={sectionRef} className={styles.stage} aria-label="Kissa, and how it works">
      <div className={styles.sticky}>
        <div className={styles.deckSlot} aria-hidden="true">
          <motion.div className={styles.deck} style={{ scale, x, y }}>
            <Vinyl ref={spinRef} platter strobeRef={strobeRef} />

            <svg viewBox="0 0 400 400" className={styles.overlay}>
              <motion.path
                d={LISTEN_RING}
                className={styles.listen}
                style={{ pathLength: listenLength, opacity: listenOpacity }}
              />
            </svg>

            <Tonearm ref={armRef} className={styles.tonearm}>
              <div
                className={`${styles.grip} ${dragging ? styles.gripHeld : ''}`}
                onPointerDown={onGrab}
                onPointerMove={onDrag}
                onPointerUp={onRelease}
                onPointerCancel={onRelease}
                title="Drag the needle to seek"
              />
            </Tonearm>

            <motion.p className={styles.status} style={{ opacity: statusOpacity }}>
              <span className={styles.statusDot} />
              {status}
            </motion.p>
          </motion.div>
        </div>

        <Chapter progress={progress} index={0} active={step === 0} className={styles.hero}>
          <p className={`label ${styles.kicker}`}>
            <Seal />
            Kissa <span className={styles.dash} /> A vinyl player for Windows
          </p>
          <TangibleHeading className={styles.heroTitle} lines={['Music,', 'made tangible.']} delay={0.1} />
          <motion.div
            className={styles.heroBody}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          >
            <p className="lead">
              A free desktop music player that turns whatever you&rsquo;re already playing into a record, turning
              quietly beside your work.
            </p>
            <div className={styles.actions}>
              <DownloadButton showMeta />
              <a href="#modes" className={styles.textLink}>
                See it in motion
              </a>
            </div>
          </motion.div>
        </Chapter>

        <Chapter progress={progress} index={1} active={step === 1}>
          <span className="label">01 &nbsp;Play</span>
          <h2 className={styles.stepTitle}>
            Play music the way <em>you already do.</em>
          </h2>
          <p className={styles.stepBody}>
            Spotify, Apple Music, TIDAL or a local player. Nothing to import, nothing to sign in to.
          </p>
        </Chapter>

        <Chapter progress={progress} index={2} active={step === 2}>
          <span className="label">02 &nbsp;Listen</span>
          <h2 className={styles.stepTitle}>
            Kissa listens <em>to Windows.</em>
          </h2>
          <p className={styles.stepBody}>
            It reads the system media session for the track, the artwork and the playback position. There is nothing
            to connect.
          </p>
        </Chapter>

        <Chapter progress={progress} index={3} active={step === 3}>
          <span className="label">03 &nbsp;Turn</span>
          <h2 className={styles.stepTitle}>
            The needle drops. <em>The record turns.</em>
          </h2>
          <p className={styles.stepBody}>
            A platter with real inertia and a tonearm that tracks the song. Drag the needle anywhere to seek, the way
            this page is doing now.
          </p>
        </Chapter>

        <Chapter progress={progress} index={4} active={step === 4}>
          <span className="label">04 &nbsp;Stay</span>
          <h2 className={styles.stepTitle}>
            Lyrics, <em>in time.</em>
          </h2>
          <div className={styles.lyricsWindow}>
            <ul
              className={styles.lyrics}
              role="list"
              aria-label="Example of synced lyric lines"
              style={{ '--line': lyric } as React.CSSProperties}
            >
              {LYRICS.map((line, i) => (
                <li key={line} data-distance={Math.min(3, Math.abs(i - lyric))}>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Chapter>
      </div>
    </section>
  )
}
