import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StartupExperienceProps {
  onComplete: () => void
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The opening moment: Kissa's own mark assembling itself. The copper ring draws round, the
 * record settles and starts to turn, the tonearm swings in and the name appears, the same
 * picture as the app icon and the website, then the room fades up behind it.
 */
export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)
  const reduceMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    // Long enough for the arm to land; short enough never to be in the way.
    const duration = reduceMotion ? 300 : 1500
    let completeTimer: ReturnType<typeof setTimeout>
    const timer = setTimeout(() => {
      setIsVisible(false)
      completeTimer = setTimeout(onComplete, 450)
    }, duration)
    return () => {
      clearTimeout(timer)
      clearTimeout(completeTimer)
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
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b0b0c] select-none pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse 55% 45% at 50% 44%, rgba(184,115,63,0.10) 0%, transparent 100%)' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 512 512" className="h-[min(38vh,240px)] w-[min(38vh,240px)] overflow-visible" role="img" aria-label="Kissa">
            <defs>
              <linearGradient id="kissa-copper" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e2a06a" />
                <stop offset="0.5" stopColor="#b8733f" />
                <stop offset="1" stopColor="#8a5229" />
              </linearGradient>
              <radialGradient id="kissa-label" cx="0.4" cy="0.35" r="0.75">
                <stop offset="0" stopColor="#e0a06c" />
                <stop offset="1" stopColor="#a4632f" />
              </radialGradient>
              <clipPath id="kissa-grooves">
                <circle cx="256" cy="256" r="212" />
              </clipPath>
            </defs>

            {/* The record: settles in and begins to turn. */}
            <motion.g
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={t(0.05, 0.6)}
              style={{ transformOrigin: '256px 256px' }}
            >
              <circle cx="256" cy="256" r="252" fill="#0b0b0c" />
              <motion.g
                initial={{ rotate: 0 }}
                animate={{ rotate: reduceMotion ? 0 : 140 }}
                transition={{ duration: reduceMotion ? 0 : 1.6, ease: [0.45, 0, 0.75, 0.45] }}
                style={{ transformOrigin: '256px 256px' }}
              >
                <g fill="none" stroke="#1e1e21" strokeWidth="2">
                  <circle cx="256" cy="256" r="196" />
                  <circle cx="256" cy="256" r="168" />
                  <circle cx="256" cy="256" r="140" />
                  <circle cx="256" cy="256" r="112" />
                  <circle cx="256" cy="256" r="84" />
                </g>
              </motion.g>
              {/* The label sits a little high, as in the mark, so it stays still while the grooves turn. */}
              <circle cx="256" cy="246" r="58" fill="url(#kissa-label)" />
              <circle cx="256" cy="246" r="57" fill="none" stroke="#f0bd8f" strokeOpacity="0.45" strokeWidth="2" />
              <circle cx="256" cy="246" r="10" fill="#0b0b0c" />
            </motion.g>

            {/* The teal waves of the mark rise into the record. */}
            <motion.g
              clipPath="url(#kissa-grooves)"
              fill="none"
              stroke="#2fb3b8"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={t(0.3, 0.7)}
            >
              <path d="M40 304c70-34 120 34 196 34s126-52 240-34" />
              <path d="M40 330c70-34 120 34 196 34s126-52 240-34" />
              <path d="M40 356c70-34 120 34 196 34s126-52 240-34" />
              <path d="M40 382c70-34 120 34 196 34s126-52 240-34" />
              <path d="M40 408c70-34 120 34 196 34s126-52 240-34" />
              <path d="M40 434c70-34 120 34 196 34s126-52 240-34" />
            </motion.g>

            {/* The copper ring draws itself round. */}
            <motion.circle
              cx="256"
              cy="256"
              r="228"
              fill="none"
              stroke="url(#kissa-copper)"
              strokeWidth="7"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0, rotate: -90 }}
              animate={{ pathLength: 1, rotate: -90 }}
              transition={t(0, 0.9)}
              style={{ transformOrigin: '256px 256px' }}
            />

            {/* The tonearm swings in from its rest and lowers onto the record. */}
            <motion.g
              initial={{ rotate: reduceMotion ? 0 : -24, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={t(0.35, 0.75)}
              style={{ transformOrigin: '438px 110px' }}
            >
              <path d="M438 112c-4 60-22 116-74 172" fill="none" stroke="url(#kissa-copper)" strokeWidth="13" strokeLinecap="round" />
              <path d="M370 268l22 22-62 44-18-18z" fill="url(#kissa-copper)" />
              <circle cx="438" cy="110" r="27" fill="url(#kissa-copper)" />
              <circle cx="438" cy="110" r="11" fill="#7a4720" />
            </motion.g>
          </svg>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t(0.55, 0.6)}
            className="mt-9 flex flex-col items-center text-center"
          >
            <span className="font-kissa-editorial text-[2.6rem] font-normal leading-none tracking-[0.01em] text-[#f2e7da]">Kissa</span>
            <span className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#b8733f]">Listening room</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
