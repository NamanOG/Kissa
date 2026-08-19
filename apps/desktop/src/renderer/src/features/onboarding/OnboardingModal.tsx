import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Volume2, Disc3, FileText, Settings2, Play } from 'lucide-react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { ThemeCard } from '../settings/ThemeCard'
import { cn } from '@renderer/utils/cn'
import kissaHeroImg from '@renderer/media/kissa_welcome_hero.jpg'

export interface OnboardingModalProps {
  className?: string
}

const STEPS = [
  { id: 'ritual', label: 'The Ritual' },
  { id: 'deck', label: 'The Deck' },
  { id: 'atmosphere', label: 'Atmosphere' }
]

const FEATURES = [
  {
    icon: Volume2,
    title: 'Play Any Music',
    body: 'Start a song in Spotify, Apple Music, Tidal, or any Windows browser. Kissa detects it automatically.'
  },
  {
    icon: Disc3,
    title: 'Platter Spins Live',
    body: 'Cover art maps onto the vinyl. The platter accelerates and decelerates with real motor physics.'
  },
  {
    icon: FileText,
    title: 'Synced Lyrics',
    body: 'Sit back with timed lyrics that scroll line by line as the song plays.'
  }
]

const DECK_FEATURES = [
  {
    title: 'Interactive Needle Drop',
    body: 'Drag the tonearm or click anywhere on the platter to seek through the track — vinyl clicks included.'
  },
  {
    title: '33⅓ & 45 RPM Speeds',
    body: 'Switch between LP 33⅓ and single 45 RPM on the plinth dial with real motor spin-up inertia.'
  },
  {
    title: 'Karaoke Depth View',
    body: 'Hit the Quote icon for a full-screen lyrics stream with optical depth-of-field blur on inactive lines.'
  }
]

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const currentTheme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)

  const [step, setStep] = useState<number>(0)

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isOnboardingOpen) return
      if (e.key === 'ArrowRight' && step < 2) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOnboardingOpen, step])

  if (!isOnboardingOpen) return null

  const close = (): void => setIsOnboardingOpen(false)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 min-[640px]:p-8 select-none',
        className
      )}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/65"
        onClick={close}
      />

      {/* Modal surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-50 w-full max-w-[720px] max-h-[85vh] flex flex-col rounded-[24px] bg-[#1a1715] border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {/* ── Hero photograph ─────────────────────────────── */}
        <div className="relative h-44 w-full overflow-hidden shrink-0 bg-[#0d0b09]">
          <img
            src={kissaHeroImg}
            alt="Kissa listening bar"
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.8) contrast(1.05) saturate(0.9)' }}
          />
          {/* Gradient into modal body (#1a1715) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1715] via-[#1a1715]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1715]/60 via-transparent to-[#1a1715]/40" />

          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full flex items-center justify-center border border-white/[0.08] bg-black/40 text-[#b7a99b] hover:text-white hover:bg-black/75 backdrop-blur-md transition-all cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Wordmark */}
          <div className="absolute bottom-5 left-8 z-10">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#d7a76c] mb-1.5 opacity-90">
              喫茶 · Jazz Kissa
            </p>
            <h1 className="font-serif text-[2.2rem] text-[#f5efe6] font-normal tracking-wide leading-none">
              Welcome to Kissa
            </h1>
          </div>
        </div>

        {/* ── Step bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-3.5 shrink-0 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-6">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <motion.div
                  className="rounded-full"
                  animate={{
                    width: step === i ? 16 : 4,
                    height: 4,
                    backgroundColor: step === i ? '#d7a76c' : step > i ? '#6b5040' : '#3a322d'
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
                <span
                  className={cn(
                    'font-mono text-[9.5px] uppercase tracking-[0.15em] transition-colors',
                    step === i ? 'text-[#d7a76c]' : 'text-[#5a4940] group-hover:text-[#887b70]'
                  )}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Step content ─────────────────────────────────── */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar relative">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-8 py-10 flex flex-col h-full justify-center"
              >
                <div className="max-w-lg mb-8">
                  <h2 className="font-serif text-[1.7rem] text-[#f5efe6] font-normal leading-tight mb-2">
                    How sound enters the room
                  </h2>
                  <p className="text-[13.5px] text-[#9c8e82] leading-relaxed font-light mb-10">
                    Kissa translates your desktop media into a living vinyl sanctuary.
                    No setup required — just play music.
                  </p>

                  <div className="space-y-6">
                    {FEATURES.map(({ icon: Icon, title, body }) => (
                      <div key={title} className="flex gap-5">
                        <div className="mt-0.5 shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05]">
                          <Icon className="w-4 h-4 text-[#887b70]" />
                        </div>
                        <div>
                          <h4 className="text-[13.5px] font-medium text-[#f5efe6]">{title}</h4>
                          <p className="mt-1 text-[12.5px] text-[#887b70] leading-relaxed font-light">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtle Callout */}
                  <div className="mt-10 flex items-center gap-3 text-[12px] text-[#887b70]">
                    <Play className="w-3.5 h-3.5 text-[#d7a76c] shrink-0" />
                    <p>
                      <span className="text-[#d7a76c] font-medium">Offline Demo:</span> If no music is playing, Kissa queues an offline track so you can explore.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-8 py-10 flex flex-col h-full justify-center"
              >
                <div className="max-w-lg mb-8">
                  <h2 className="font-serif text-[1.7rem] text-[#f5efe6] font-normal leading-tight mb-2">
                    Tactile Deck Mechanics
                  </h2>
                  <p className="text-[13.5px] text-[#9c8e82] leading-relaxed font-light mb-10">
                    Every interaction carries physical weight, needle acoustics, and analog inertia.
                  </p>

                  <div className="space-y-6">
                    {DECK_FEATURES.map(({ title, body }) => (
                      <div key={title} className="flex gap-5">
                        <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#d7a76c]/40" />
                        <div>
                          <h4 className="text-[13.5px] font-medium text-[#f5efe6]">{title}</h4>
                          <p className="mt-1.5 text-[12.5px] text-[#887b70] leading-relaxed font-light">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 flex items-center gap-3 text-[12px] text-[#887b70]">
                    <Settings2 className="w-3.5 h-3.5 text-[#d7a76c] shrink-0" />
                    <p>
                      <span className="text-[#d7a76c] font-medium">Pro tip:</span> Press <kbd className="font-mono text-[#b7a99b] bg-white/[0.05] px-1 rounded">?</kbd> at any time to view keyboard shortcuts.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-8 py-10"
              >
                <h2 className="font-serif text-[1.7rem] text-[#f5efe6] font-normal leading-tight mb-2">
                  Choose your atmosphere
                </h2>
                <p className="text-[13.5px] text-[#9c8e82] font-light mb-8">
                  Eight distinct listening environments — each with its own lighting, palette, and mood.
                </p>

                <div className="grid grid-cols-2 min-[500px]:grid-cols-4 gap-4">
                  {LISTENING_ENVIRONMENTS.map((env) => (
                    <ThemeCard
                      key={env.id}
                      theme={env}
                      isSelected={currentTheme === env.id}
                      onSelect={() => setTheme(env.id as AppTheme)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-6 shrink-0 border-t border-white/[0.04]">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 text-[13px] text-[#887b70] hover:text-[#f5efe6] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>

          <div>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium text-[#f5efe6] bg-white/[0.05] border border-white/[0.05] hover:bg-white/[0.1] transition-all cursor-pointer"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium text-[#1a1410] bg-[#d7a76c] hover:bg-[#dfb47e] transition-all cursor-pointer"
              >
                Start Listening
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

