import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, LayoutGrid, Disc3, Maximize, Quote, Palette, Share2 } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'
import onboardingIntro from '@renderer/media/onboarding_intro.jpg'
import onboardingSetup from '@renderer/media/onboarding_setup.jpg'
import onboardingControl from '@renderer/media/onboarding_control.jpg'
import onboardingSettings from '@renderer/media/onboarding_settings.jpg'
import onboardingReady from '@renderer/media/onboarding_ready.jpg'

export interface OnboardingModalProps {
  className?: string
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const [step, setStep] = useState<number>(0)

  // Use window.matchMedia for reduced motion just in case it's not fully synced in tests/store yet
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReducedMotion(media.matches)
      
      const listener = () => setReducedMotion(media.matches)
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isOnboardingOpen) return
      
      // Do not intercept if user is typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowRight' && step < 4) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
      if (e.key === 'Escape') setIsOnboardingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOnboardingOpen, step, setIsOnboardingOpen])

  // Reset step if closed
  useEffect(() => {
    if (!isOnboardingOpen) {
      const t = setTimeout(() => setStep(0), 400) // Reset after fade out
      return () => clearTimeout(t)
    }
  }, [isOnboardingOpen])

  if (!isOnboardingOpen) return null

  const close = (): void => setIsOnboardingOpen(false)
  const isReduced = reducedMotion

  // Unified transition configs
  const fadeTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
  const slideTransition = isReduced
    ? fadeTransition
    : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }

  const slideVariants = {
    initial: { opacity: 0, x: isReduced ? 0 : 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isReduced ? 0 : -20 }
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center select-none p-4 min-[640px]:p-8',
        className
      )}
    >
      {/* Absolute Backdrop Layer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fadeTransition}
        className="fixed inset-0 bg-[#0a0806]/95 backdrop-blur-xl pointer-events-auto"
        onClick={close}
      />

      {/* Cinematic Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: isReduced ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: isReduced ? 1 : 0.98 }}
        transition={slideTransition}
        className="relative z-50 w-full max-w-4xl h-[80vh] min-h-[500px] max-h-[700px] rounded-2xl bg-[#14110e] border border-[#2a241e] shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden pointer-events-auto flex flex-col"
      >
        {/* Header / Dismiss */}
        <div className="absolute top-0 right-0 p-6 z-20">
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 border border-white/5 text-[#8e8175] hover:text-[#d7a76c] hover:bg-black/60 hover:border-[#d7a76c]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#d7a76c]/50 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {/* STEP 1: INTRO */}
            {step === 0 && (
              <motion.div
                key="step-0"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 min-[900px]:p-12 text-center"
              >
                <div className="w-full max-w-2xl h-[35vh] max-h-[280px] rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.4)] border border-white/5 mb-8 relative">
                  <img src={onboardingIntro} className="absolute inset-0 w-full h-full object-cover" draggable={false} alt="Kissa Intro" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                </div>
                <h1 className="font-serif text-5xl min-[640px]:text-6xl text-[#f5efe6] font-medium tracking-tight mb-4">
                  Kissa
                </h1>
                <p className="font-sans text-[15px] min-[640px]:text-[17px] text-[#b7a99b] max-w-md leading-relaxed font-light">
                  A music player built around the feeling of listening.
                </p>
              </motion.div>
            )}

            {/* STEP 2: GUIDE */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 flex flex-col p-6 min-[900px]:p-10 overflow-hidden"
              >
                <div className="flex flex-col min-[900px]:flex-row gap-6 h-full">
                  {/* Image */}
                  <div className="w-full min-[900px]:w-[45%] h-40 min-[900px]:h-full rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.4)] border border-white/5 relative shrink-0">
                    <img src={onboardingSetup} className="absolute inset-0 w-full h-full object-cover" draggable={false} alt="Kissa Setup" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pt-2">
                    <div className="mb-4 shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                        Chapter I • Guide
                      </span>
                      <h2 className="font-serif text-2xl min-[900px]:text-3xl text-[#f5efe6] font-medium tracking-tight mt-1">
                        The Setup
                      </h2>
                    </div>

                    <div className="flex-1 border-t border-white/[0.08] grid grid-cols-1 min-[640px]:grid-cols-2 gap-x-4 gap-y-1 content-start pt-3">
                      {/* Left Column items */}
                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">01</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Record Shelf</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Your collection becomes the shelf.</p>
                      </div>
                      
                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">04</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Lyrics</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Follow the song as it plays.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">02</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Turntable</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">A tactile listening surface.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">05</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Match Album</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">The room inherits the character.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">03</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Listening Room</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Enter fullscreen listening.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">06</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Listening Cards</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Keep a visual artifact.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SHORTCUTS & ABOUT */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 flex flex-col p-6 min-[900px]:p-10 overflow-hidden"
              >
                <div className="flex flex-col min-[900px]:flex-row gap-6 h-full">
                  {/* Image */}
                  <div className="w-full min-[900px]:w-[45%] h-40 min-[900px]:h-full rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.4)] border border-white/5 relative shrink-0">
                    <img src={onboardingControl} className="absolute inset-0 w-full h-full object-cover" draggable={false} alt="Kissa Control" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pt-2 gap-6">
                    {/* Shortcuts */}
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                        Chapter II • Control
                      </span>
                      <h2 className="font-serif text-2xl min-[900px]:text-3xl text-[#f5efe6] font-medium tracking-tight mt-1 mb-3">
                        Keyboard Shortcuts
                      </h2>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <kbd className="h-6 px-2 rounded bg-white/[0.08] border border-white/[0.1] text-white font-sans text-[11px] font-semibold flex items-center justify-center shadow-sm">F11</kbd>
                          <span className="font-sans text-[12px] text-[#a89b8d]">Toggle Fullscreen Listening Room</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <kbd className="h-6 px-2.5 rounded bg-white/[0.08] border border-white/[0.1] text-white font-sans text-[11px] font-semibold flex items-center justify-center shadow-sm">Space</kbd>
                          <span className="font-sans text-[12px] text-[#a89b8d]">Play / Pause Audio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 mr-2">
                            <kbd className="w-6 h-6 rounded bg-white/[0.08] border border-white/[0.1] text-white font-sans text-[10px] flex items-center justify-center shadow-sm">←</kbd>
                            <kbd className="w-6 h-6 rounded bg-white/[0.08] border border-white/[0.1] text-white font-sans text-[10px] flex items-center justify-center shadow-sm">→</kbd>
                          </div>
                          <span className="font-sans text-[12px] text-[#a89b8d]">Seek 5s backward / forward</span>
                        </div>
                      </div>
                    </div>

                    {/* About Kissa */}
                    <div className="border-t border-white/[0.08] pt-4">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                        Chapter III • Philosophy
                      </span>
                      <h2 className="font-serif text-2xl min-[900px]:text-3xl text-[#f5efe6] font-medium tracking-tight mt-1 mb-3">
                        About Kissa
                      </h2>
                      
                      <div className="space-y-2.5">
                        <p className="font-sans text-[12.5px] text-[#b7a99b] leading-relaxed font-light">
                          Digital music often feels weightless and disposable. Kissa was designed to bring back the deliberate, tactile reverence of playing a physical vinyl record.
                        </p>
                        <p className="font-sans text-[12.5px] text-[#b7a99b] leading-relaxed font-light">
                          No algorithmic distractions or intrusive banners. Simply a quiet space for you and your collection to coexist.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: ATMOSPHERE & HARDWARE CONFIGURATION */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 flex flex-col p-6 min-[900px]:p-10 overflow-hidden"
              >
                <div className="flex flex-col min-[900px]:flex-row gap-6 h-full">
                  {/* Image */}
                  <div className="w-full min-[900px]:w-[45%] h-40 min-[900px]:h-full rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.4)] border border-white/5 relative shrink-0">
                    <img src={onboardingSettings} className="absolute inset-0 w-full h-full object-cover" draggable={false} alt="Kissa Settings" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pt-2">
                    <div className="mb-4 shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                        Chapter IV • Preferences
                      </span>
                      <h2 className="font-serif text-2xl min-[900px]:text-3xl text-[#f5efe6] font-medium tracking-tight mt-1">
                        Atmosphere & Audio
                      </h2>
                    </div>

                    <div className="flex-1 border-t border-white/[0.08] grid grid-cols-1 min-[640px]:grid-cols-2 gap-x-4 gap-y-1 content-start pt-3">
                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">01</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Atmospheres</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">8 bespoke environments or adaptive album art.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">02</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Hardware Mechanics</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">33/45 RPM speeds and tactile needle thud.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">03</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">Lyrics Calibration</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Fine-tune vocal timing offset and auto-scroll.</p>
                      </div>

                      <div className="flex flex-col py-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[8px] text-[#d7a76c] font-bold">04</span>
                          <h3 className="font-kissa-chassis uppercase tracking-[0.15em] text-[8.5px] min-[900px]:text-[9.5px] text-[#f5efe6] font-semibold">System Integration</h3>
                        </div>
                        <p className="font-serif text-[13px] min-[900px]:text-[14px] text-[#a89b8d] leading-snug">Spotify, Apple Music & Windows SMTC sync.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: START LISTENING */}
            {step === 4 && (
              <motion.div
                key="step-4"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 min-[900px]:p-12 text-center"
              >
                <div className="w-full max-w-2xl h-[35vh] max-h-[280px] rounded-2xl overflow-hidden shadow-[0_16px_32px_rgba(0,0,0,0.4)] border border-white/5 mb-6 relative">
                  <img src={onboardingReady} className="absolute inset-0 w-full h-full object-cover" draggable={false} alt="Kissa Sanctuary" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                </div>

                <h1 className="font-serif text-4xl min-[640px]:text-5xl text-[#f5efe6] font-medium tracking-tight mb-3">
                  Ready.
                </h1>
                <p className="font-sans text-[14px] min-[640px]:text-[15.5px] text-[#b7a99b] max-w-sm leading-relaxed font-light mb-6">
                  Place a record on the platter, lower the tonearm, and enjoy the music.
                </p>

                <button
                  type="button"
                  onClick={close}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#d7a76c] to-[#e4b982] text-[#14110e] font-sans text-[14px] font-bold tracking-wide hover:brightness-110 shadow-[0_8px_32px_rgba(215,167,108,0.35)] transition duration-ui ease-primary active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#d7a76c]/30"
                >
                  Start Listening
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-[#2a241e] bg-[#0f0c0a] shrink-0">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-[#8e8175] hover:text-[#f5efe6] hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#7a6e62] hover:text-[#b7a99b] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
              >
                Skip Intro
              </button>
            )}
          </div>

          {/* Pagination dots */}
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors duration-300',
                  step === i ? 'bg-[#d7a76c]' : 'bg-[#2a241e]'
                )}
              />
            ))}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-[#f5efe6] bg-white/[0.04] hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-[84px]">
                {/* Spacer to keep dots centered */}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
