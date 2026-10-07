import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StartupExperienceProps {
  onComplete: () => void
}

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)
  const reduceMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    // Long enough for the stylus to land and the platter to reach speed.
    const duration = reduceMotion ? 300 : 1400

    let completeTimer: NodeJS.Timeout
    const timer = setTimeout(() => {
      setIsVisible(false)
      completeTimer = setTimeout(onComplete, 300)
    }, duration)

    return () => {
      clearTimeout(timer)
      clearTimeout(completeTimer)
    }
  }, [onComplete, reduceMotion])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f0b07] select-none pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 50% at 50% 46%, rgba(52,34,20,0.55) 0%, transparent 100%)'
          }}
          aria-hidden="true"
        >
          {/* Platter + tonearm share one box so the stylus lands on the record */}
          <div className="relative h-52 w-52 min-[900px]:h-56 min-[900px]:w-56">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: reduceMotion ? 0 : 300 }}
              transition={{ duration: 1.3, ease: [0.5, 0, 0.9, 0.6] }}
              className="absolute inset-0 rounded-full shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.07)]"
              style={{
                background:
                  'repeating-radial-gradient(circle at 50% 50%, #171310 0px, #171310 1.5px, #0e0c0a 2.5px, #0e0c0a 4px)'
              }}
            >
              {/* Light catching the grooves; rotates with the disc so the spin reads */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 30deg, transparent 0deg, rgba(255,255,255,0.08) 40deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.08) 220deg, transparent 270deg)'
                }}
              />
              {/* Lead-in and run-out grooves */}
              <div className="absolute inset-[26%] rounded-full border border-white/[0.05]" />
              <div className="absolute inset-[6%] rounded-full border border-white/[0.04]" />

              <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[var(--accent,#e08e45)]/30 bg-[#2a1b12]">
                <span className="font-serif text-[10px] italic tracking-[0.18em] text-[#f5efe6]/90">
                  kissa
                </span>
                <span className="mt-0.5 font-mono text-[7px] uppercase tracking-wider text-[#d7a76c]/70">
                  33 ⅓
                </span>
                <div className="absolute h-1.5 w-1.5 rounded-full bg-[#080706]" />
              </div>
            </motion.div>

            <motion.svg
              viewBox="0 0 120 220"
              width="120"
              height="220"
              initial={{ rotate: reduceMotion ? 0 : -26 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-1 left-[150px] min-[900px]:left-[164px] overflow-visible"
              style={{ transformOrigin: '100px 16px' }}
            >
              <line x1="100" y1="16" x2="40" y2="150" stroke="#8a7a6a" strokeWidth="3" strokeLinecap="round" />
              <rect x="32" y="146" width="16" height="26" rx="2" transform="rotate(24 40 150)" fill="#1d1814" stroke="#8a7a6a" strokeWidth="1" />
              <circle cx="100" cy="16" r="10" fill="#1d1814" stroke="#8a7a6a" strokeWidth="1.5" />
              <circle cx="100" cy="16" r="3" fill="#8a7a6a" />
            </motion.svg>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-col items-center text-center px-4"
          >
            <h1 className="font-serif text-3xl font-normal italic tracking-wide text-[#f5efe6] min-[900px]:text-4xl">
              Welcome to Kissa
            </h1>
            <div className="mt-4 h-px w-10 bg-[var(--accent,#e08e45)]/50" />
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#a6866b]">
              A music player for the deliberate listener
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
