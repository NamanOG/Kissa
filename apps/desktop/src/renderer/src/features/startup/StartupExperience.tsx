import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StartupExperienceProps {
  onComplete: () => void
}

export const StartupExperience: React.FC<StartupExperienceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const duration = prefersReducedMotion ? 300 : 850

    let completeTimer: NodeJS.Timeout
    const timer = setTimeout(() => {
      setIsVisible(false)
      completeTimer = setTimeout(onComplete, 300)
    }, duration)

    return () => {
      clearTimeout(timer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f0b07] select-none pointer-events-none"
          aria-hidden="true"
        >
          {/* Subtle warm amber ambient illumination blooming around the platter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(224,142,69,0.18)_0%,rgba(180,83,9,0.06)_50%,transparent_75%)] blur-3xl pointer-events-none"
          />

          {/* Physical spinning vinyl disc & platter */}
          <div className="relative flex items-center justify-center mb-8">
            <motion.div
              initial={{ rotate: 0, opacity: 0.6 }}
              animate={{ rotate: 360, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
              className="relative w-44 h-44 min-[900px]:w-52 min-[900px]:h-52 rounded-full bg-[#12100e] shadow-[0_24px_56px_rgba(0,0,0,0.92),inset_0_0_0_1px_rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden"
              style={{
                background:
                  'repeating-radial-gradient(circle at 50% 50%, #171310 0px, #171310 2px, #0f0d0b 3px, #0f0d0b 5px)'
              }}
            >
              {/* Specular anisotropic vinyl light reflection */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.07) 60deg, transparent 120deg, transparent 180deg, rgba(255,255,255,0.07) 240deg, transparent 300deg)'
                }}
              />

              {/* Concentric micro-grooves */}
              <div className="absolute inset-3 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-7 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-11 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-15 rounded-full border border-white/[0.04]" />

              {/* Center record label in warm walnut lacquer */}
              <div className="relative w-16 h-16 min-[900px]:w-20 min-[900px]:h-20 rounded-full bg-gradient-to-br from-[#38251a] to-[#1c120c] border border-[var(--accent,#e08e45)]/40 flex flex-col items-center justify-center shadow-[inset_0_2px_5px_rgba(0,0,0,0.7),0_1px_3px_rgba(0,0,0,0.4)]">
                {/* Center label brandmark */}
                <span className="font-serif italic text-[9px] min-[900px]:text-[10px] tracking-[0.2em] text-[#f5efe6]/90 mb-1">
                  kissa
                </span>

                {/* Spindle hole */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#080706] border border-white/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" />

                <span className="font-mono text-[7px] tracking-wider text-[#d7a76c]/70 mt-1 uppercase">
                  33 ⅓
                </span>
              </div>
            </motion.div>
          </div>

          {/* Typography: Welcome to Kissa */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="flex flex-col items-center text-center px-4"
          >
            <h1 className="font-serif italic text-3xl min-[900px]:text-4xl tracking-wide text-[#f5efe6] font-normal drop-shadow-[0_2px_16px_rgba(224,142,69,0.25)]">
              Welcome to Kissa
            </h1>
            <p className="font-mono text-[10.5px] tracking-[0.22em] text-[#a6866b] uppercase mt-2 opacity-85">
              A music player for the deliberate listener
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
