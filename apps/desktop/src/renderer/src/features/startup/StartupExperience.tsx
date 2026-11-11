import { prefersReducedMotion } from '@renderer/hooks/useReducedMotion'
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import markSrc from '@renderer/assets/brand/kissa-mark-384.webp'
import { tl } from '@renderer/i18n'

interface StartupExperienceProps {
  onComplete: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const

/** The opening's background. index.html paints the same colour first, so there is one opening, not two. */
export const OPENING_BACKGROUND = '#0b0a09'

/** How long the opening holds before it lifts away, from the moment it starts playing. */
const HOLD_MS = 1550
const HOLD_REDUCED_MS = 250
/** Longest wait for the window to come on screen before the opening plays anyway. */
const SHOWN_CAP_MS = 8000

/** Resolves when Kissa's mark is decoded (so it never pops in mid-fade), or after a short cap. */
function markReady(): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = markSrc
    if (typeof img.decode !== 'function') return resolve()
    const cap = setTimeout(resolve, 600)
    img.decode().then(
      () => {
        clearTimeout(cap)
        resolve()
      },
      () => {
        clearTimeout(cap)
        resolve()
      }
    )
  })
}

/** Resolves when the name's and the tagline's faces are loaded (a late swap restyles the page mid-opening). */
function fontsReady(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fonts?.load) return Promise.resolve()
  const both = Promise.all([
    fonts.load('400 44px "Newsreader Variable"', 'Kissa'),
    fonts.load('500 14px "Archivo Variable"', 'Listening room')
  ]).then(
    () => undefined,
    () => undefined
  )
  return Promise.race([both, new Promise<void>((r) => setTimeout(r, 600))])
}

/**
 * Waits until the room under the opening has settled: its first render, cover colours and data
 * arriving cause long style passes, and the opening should play over a quiet page, not stutter
 * through them. Quiet means 100 ms of timers firing on time (animation frames barely tick while
 * the window is still hidden, so they cannot be the measure). Never more than a second.
 */
function roomSettled(): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    let last = start
    let quiet = 0
    const poll = (): void => {
      const now = performance.now()
      quiet = now - last < 26 ? quiet + 1 : 0
      last = now
      if (quiet >= 6 || now - start > 1000) resolve()
      else setTimeout(poll, 16)
    }
    setTimeout(poll, 16)
  })
}
/**
 * The opening: Kissa's own mark comes into focus out of the dark, a band of light passes across
 * the record, the name settles under it, and the whole picture lifts away to reveal the room.
 * About two seconds; a quarter second with reduced motion. It starts only once the window is on
 * screen (the window is shown when this has drawn its first frame), so loading never eats into
 * it. Any key or click lifts it at once.
 */
export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const reduceMotion = typeof window !== 'undefined' && prefersReducedMotion()
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const completedRef = useRef(false)
  const complete = (): void => {
    if (completedRef.current) return
    completedRef.current = true
    completeRef.current()
  }

  // Draw the first (dark) frame, then show the window, then play.
  useEffect(() => {
    let cancelled = false
    const shown = Promise.all([roomSettled(), markReady(), fontsReady()]).then(() => {
      window.electron?.startupMark?.('opening-ready')
      const ready = window.electron?.openingReady?.()
      if (!ready) return
      void ready.then(() => window.electron?.startupMark?.('opening-shown'))
      return Promise.race([ready, new Promise<void>((r) => setTimeout(r, SHOWN_CAP_MS))])
    })
    if (!window.electron?.openingReady) setPlaying(true)
    else
      void shown.then(() => {
        if (!cancelled) setPlaying(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    window.electron?.startupMark?.('intro-start')
    performance.mark?.('kissa:intro-start')
    let completeTimer: ReturnType<typeof setTimeout> | undefined
    let arriveTimer: ReturnType<typeof setTimeout> | undefined
    const lift = (): void => {
      clearTimeout(timer)
      if (completeTimer) return
      window.electron?.startupMark?.('intro-end')
      performance.mark?.('kissa:intro-end')
      setIsVisible(false)
      // As the opening lifts, the room arrives: the side panel slides in, the dock rises, the
      // deck settles (main.css, kissa-arrive). Once only, so it never replays on a remount.
      if (!reduceMotion) {
        document.documentElement.setAttribute('data-kissa-arrive', '')
        arriveTimer = setTimeout(() => document.documentElement.removeAttribute('data-kissa-arrive'), 1600)
      }
      completeTimer = setTimeout(complete, 450)
    }
    const timer = setTimeout(lift, reduceMotion ? HOLD_REDUCED_MS : HOLD_MS)
    const skip = (): void => {
      setSkipped(true)
      lift()
    }
    addEventListener('keydown', skip, true)
    addEventListener('pointerdown', skip, true)
    return () => {
      clearTimeout(timer)
      if (completeTimer) clearTimeout(completeTimer)
      removeEventListener('keydown', skip, true)
      removeEventListener('pointerdown', skip, true)
      if (arriveTimer) {
        clearTimeout(arriveTimer)
        document.documentElement.removeAttribute('data-kissa-arrive')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reduceMotion])

  const t = (delay: number, duration: number): { delay: number; duration: number; ease: typeof EASE } => ({
    delay: reduceMotion ? 0 : delay,
    duration: reduceMotion ? 0 : duration,
    ease: EASE
  })
  // Until the window is on screen every part holds its first (hidden) frame.
  const play = <T,>(target: T): T | undefined => (playing ? target : undefined)

  return (
    <AnimatePresence onExitComplete={complete}>
      {isVisible && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          // Fade and lift only: a blur over the whole window, repainted every frame while the room
          // mounts underneath it, was the start-up's longest frames (perf-stability.md).
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.035 }}
          transition={{ duration: reduceMotion ? 0.15 : skipped ? 0.25 : 0.42, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none pointer-events-none"
          style={{ backgroundColor: OPENING_BACKGROUND }}
          aria-hidden="true"
        >
          {/* Warm light gathering behind the mark. */}
          <div className="absolute inset-0 flex items-center justify-center pb-[8vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={play({ opacity: 1, scale: 1 })}
              transition={t(0, 1.2)}
              className="h-[min(80vh,640px)] w-[min(80vh,640px)] rounded-full bg-[radial-gradient(circle,rgba(196,128,72,0.16)_0%,rgba(196,128,72,0.05)_38%,transparent_68%)]"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(14px)' }}
            animate={play({ opacity: 1, scale: 1, filter: 'blur(0px)' })}
            transition={t(0.05, 0.9)}
            className="relative h-[min(32vh,232px)] w-[min(32vh,232px)]"
          >
            <img
              src={markSrc}
              alt="Kissa"
              draggable={false}
              className="h-full w-full rounded-full shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)]"
            />
            {/* A band of light crosses the record once, like a lamp catching the grooves. */}
            {!reduceMotion && (
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <motion.span
                  initial={{ x: '-130%' }}
                  animate={play({ x: '130%' })}
                  transition={{ delay: 0.45, duration: 1.05, ease: [0.45, 0, 0.25, 1] }}
                  className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(105deg,transparent_30%,rgba(255,236,214,0.16)_48%,rgba(255,236,214,0.04)_56%,transparent_70%)] mix-blend-screen"
                />
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.12em' }}
            animate={play({ opacity: 1, y: 0, letterSpacing: '0.01em' })}
            transition={t(0.4, 0.9)}
            className="relative mt-9 font-kissa-editorial text-[2.75rem] font-normal leading-none text-[#f3ebe1]"
          >
            Kissa
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={play({ opacity: 1 })}
            transition={t(0.7, 0.7)}
            className="relative mt-3 text-[14px] font-medium text-[#b9a48e]"
          >
            {tl('startup.tagline')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
