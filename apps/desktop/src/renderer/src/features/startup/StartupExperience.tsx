import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import markSrc from '@renderer/assets/brand/kissa-mark-384.webp'

interface StartupExperienceProps {
  onComplete: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const

/** The opening's background. index.html paints the same colour first, so there is one opening, not two. */
export const OPENING_BACKGROUND = '#0b0a09'

/**
 * The opening: Kissa's own mark comes into focus out of the dark, a band of light passes across
 * the record, the name settles under it, and the whole picture lifts away to reveal the room.
 * About a second and a half; a tenth of that with reduced motion.
 */
export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)
  const reduceMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const duration = reduceMotion ? 250 : 1550
    let completeTimer: ReturnType<typeof setTimeout>
    let arriveTimer: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      setIsVisible(false)
      // As the opening lifts, the room arrives: the side panel slides in, the dock rises, the
      // deck settles (main.css, kissa-arrive). Once only, so it never replays on a remount.
      if (!reduceMotion) {
        document.documentElement.setAttribute('data-kissa-arrive', '')
        arriveTimer = setTimeout(() => document.documentElement.removeAttribute('data-kissa-arrive'), 1600)
      }
      completeTimer = setTimeout(onComplete, 450)
    }, duration)
    return () => {
      clearTimeout(timer)
      clearTimeout(completeTimer)
      if (arriveTimer) {
        clearTimeout(arriveTimer)
        document.documentElement.removeAttribute('data-kissa-arrive')
      }
    }
  }, [onComplete, reduceMotion])

  const t = (delay: number, duration: number): { delay: number; duration: number; ease: typeof EASE } => ({
    delay: reduceMotion ? 0 : delay,
    duration: reduceMotion ? 0 : duration,
    ease: EASE
  })

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.035, filter: 'blur(6px)' }}
          transition={{ duration: reduceMotion ? 0.15 : 0.42, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none pointer-events-none"
          style={{ backgroundColor: OPENING_BACKGROUND }}
          aria-hidden="true"
        >
          {/* Warm light gathering behind the mark. */}
          <div className="absolute inset-0 flex items-center justify-center pb-[8vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t(0, 1.2)}
              className="h-[min(80vh,640px)] w-[min(80vh,640px)] rounded-full bg-[radial-gradient(circle,rgba(196,128,72,0.16)_0%,rgba(196,128,72,0.05)_38%,transparent_68%)]"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(14px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
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
                  animate={{ x: '130%' }}
                  transition={{ delay: 0.45, duration: 1.05, ease: [0.45, 0, 0.25, 1] }}
                  className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(105deg,transparent_30%,rgba(255,236,214,0.16)_48%,rgba(255,236,214,0.04)_56%,transparent_70%)] mix-blend-screen"
                />
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10, letterSpacing: '0.12em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.01em' }}
            transition={t(0.4, 0.9)}
            className="relative mt-9 font-kissa-editorial text-[2.75rem] font-normal leading-none text-[#f3ebe1]"
          >
            Kissa
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={t(0.7, 0.7)}
            className="relative mt-3 text-[14px] font-medium text-[#b9a48e]"
          >
            Listening room
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
