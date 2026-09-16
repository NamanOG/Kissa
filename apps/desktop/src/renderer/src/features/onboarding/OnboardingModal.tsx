import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'
import { useMechanicalTick } from '@renderer/hooks/useMechanicalTick'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'

import onboardingIntro from '@renderer/media/onboarding_intro.jpg'
import onboardingSetup from '@renderer/media/onboarding_setup.jpg'
import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'
import quietRoomEnv from '@renderer/media/environments/01_quiet_room.jpg'
import onboardingSettings from '@renderer/media/onboarding_settings.jpg'
import onboardingReady from '@renderer/media/onboarding_ready.jpg'
import onboardingControl from '@renderer/media/onboarding_control.jpg'

export interface OnboardingModalProps {
  className?: string
}

interface GuideStep {
  title: string
  subtitle: string
  description: string
  image: string
  imageAlt: string
  imageFit?: 'cover' | 'contain'
  details?: { label: string; text: string }[]
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Kissa',
    subtitle: 'A music player built around the feeling of listening.',
    description:
      'Digital music often feels weightless and disposable. Kissa brings back the deliberate, tactile reverence of playing a physical vinyl record—giving your music room to breathe in a quiet, dedicated space.',
    image: onboardingIntro,
    imageAlt: 'Kissa listening player'
  },
  {
    title: 'The Turntable',
    subtitle: 'A physical listening surface that follows music from your apps.',
    description:
      'Watch the platter rotate at 33⅓ or 45 RPM with authentic inertia. The tonearm tracks the needle through the groove in real time, and dragging the headshell lets you physically seek across the record surface.',
    image: onboardingSetup,
    imageAlt: 'Physical turntable listening surface',
    details: [
      { label: 'Speeds', text: 'Switch between 33⅓ and 45 RPM' },
      { label: 'Needle Drop', text: 'Drag and drop the tonearm to seek or return to rest' }
    ]
  },
  {
    title: 'The Shelf',
    subtitle: 'Your listening history becomes an archival record crate.',
    description:
      'Every album you listen to is archived in a wooden record crate. Flip through vinyl sleeves by date or title, pull out a jacket to examine the artwork, and revisit past listening sessions with ease.',
    image: kissaIdleCover,
    imageAlt: 'Archival record shelf crate',
    imageFit: 'cover',
    details: [
      { label: 'Crate Flipping', text: 'Navigate records like an authentic collection' },
      { label: 'Artwork Inspection', text: 'Pull records forward to view sleeve art' }
    ]
  },
  {
    title: 'The Room',
    subtitle: 'Ambient illumination and listening room environments.',
    description:
      'Transform your workspace into a quiet Japanese listening cafe. Choose from eight atmospheric lighting environments or let the room adaptively sample the palette of the current album.',
    image: quietRoomEnv,
    imageAlt: 'Listening room environment',
    details: [
      { label: 'Environments', text: '8 curated physical listening rooms' },
      { label: 'Adaptive Lighting', text: 'Ambient glow subtly matches album art' }
    ]
  },
  {
    title: 'The Words',
    subtitle: 'Synchronized, interactive lyric tracking.',
    description:
      'Read time-synced lyrics that flow naturally with the vocal phrasing. Click any line to seek directly to that lyric in the song, or fine-tune timing calibration to your personal taste.',
    image: onboardingSettings,
    imageAlt: 'Synchronized lyric tracking',
    details: [
      { label: 'Interactive Seeking', text: 'Click any lyric line to jump directly' },
      { label: 'Timing Calibration', text: 'Adjust millisecond offset in settings' }
    ]
  },
  {
    title: 'The Display',
    subtitle: 'A quiet fullscreen presence and native Windows screensaver.',
    description:
      'Press D or F11 to enter a distraction-free fullscreen display with subtle clock readouts and glowing vinyl. When your PC is idle, Kissa functions as a native Windows screensaver.',
    image: onboardingReady,
    imageAlt: 'Quiet fullscreen display and screensaver',
    details: [
      { label: 'Listening Display', text: 'Press D for a calm full-screen presence' },
      { label: 'Screensaver', text: 'Native Windows screensaver with lyric display' }
    ]
  },
  {
    title: 'Control',
    subtitle: 'Keyboard shortcuts and external media integration.',
    description:
      'Kissa follows Spotify, Apple Music, TIDAL, and browser audio sessions. Manage playback effortlessly with intuitive keyboard shortcuts designed for fluid operation.',
    image: onboardingControl,
    imageAlt: 'Keyboard shortcuts and media controls',
    details: [
      { label: 'Space', text: 'Play or pause playback' },
      { label: '← / →', text: 'Seek 5 seconds backward or forward' },
      { label: 'Shift + ← / →', text: 'Previous or next track' },
      { label: '?', text: 'Open quick shortcut reference' }
    ]
  }
]

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const rpm = usePlayerStore((s) => s.rpm)
  const setRpm = usePlayerStore((s) => s.setRpm)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const toggleScreensaverLyrics = usePlayerStore((s) => s.toggleScreensaverLyrics)
  const playTick = useMechanicalTick()

  const [step, setStep] = useState<number>(0)

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

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      if (e.key === 'ArrowRight' && step < GUIDE_STEPS.length - 1) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
      if (e.key === 'Escape') setIsOnboardingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOnboardingOpen, step, setIsOnboardingOpen])

  useEffect(() => {
    if (!isOnboardingOpen) {
      const t = setTimeout(() => setStep(0), 400)
      return () => clearTimeout(t)
    }
  }, [isOnboardingOpen])

  if (!isOnboardingOpen) return null

  const close = (): void => setIsOnboardingOpen(false)
  const isReduced = reducedMotion

  const fadeTransition = { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }
  const slideTransition = isReduced
    ? fadeTransition
    : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

  const slideVariants = {
    initial: { opacity: 0, x: isReduced ? 0 : 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isReduced ? 0 : -16 }
  }

  const currentStep = GUIDE_STEPS[step]
  const isLastStep = step === GUIDE_STEPS.length - 1

  const activeEnvObj = LISTENING_ENVIRONMENTS.find((e) => e.id === theme)
  const stepImage = step === 3 && activeEnvObj?.image ? activeEnvObj.image : currentStep.image

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
        className="fixed inset-0 bg-[#0a0806]/92 backdrop-blur-xl pointer-events-auto"
        onClick={close}
      />

      {/* Editorial Guide Container */}
      <motion.div
        initial={{ opacity: 0, scale: isReduced ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: isReduced ? 1 : 0.98 }}
        transition={slideTransition}
        className="relative z-50 w-full max-w-4xl h-[84vh] min-h-[520px] max-h-[720px] rounded-2xl bg-[#14110e] border border-[#2a241e] shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden pointer-events-auto flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-[15px] text-[#f5efe6]/80 tracking-wide">
              Kissa
            </span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-[12px] font-mono text-[#a89b8d]">Guide</span>
          </div>

          <button
            type="button"
            onClick={close}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8e8175] hover:text-[#f5efe6] hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${step}`}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideTransition}
              className="absolute inset-0 flex flex-col min-[900px]:flex-row gap-6 p-6 min-[900px]:p-10 overflow-y-auto no-scrollbar"
            >
              {/* Standardized Outer Frame for Feature Visuals */}
              <div className="w-full min-[900px]:w-[48%] h-48 min-[900px]:h-full rounded-2xl bg-[#0a0807] border border-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden relative shrink-0 flex items-center justify-center p-1">
                <img
                  src={stepImage}
                  alt={currentStep.imageAlt}
                  className={cn(
                    'w-full h-full rounded-xl transition-opacity duration-300',
                    currentStep.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                  )}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Text & Content Column */}
              <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-mono tracking-widest text-[#d7a76c] font-medium">
                      {step + 1} of {GUIDE_STEPS.length}
                    </span>
                    <h2 className="font-serif text-3xl min-[900px]:text-4xl text-[#f5efe6] font-normal tracking-tight mt-1">
                      {currentStep.title}
                    </h2>
                  </div>

                  <p className="text-[14px] min-[900px]:text-[15px] font-medium text-[#d6cec7] leading-snug">
                    {currentStep.subtitle}
                  </p>

                  <p className="text-[13px] min-[900px]:text-[13.5px] text-[#a89b8d] font-light leading-relaxed">
                    {currentStep.description}
                  </p>

                  {/* Feature highlights if present */}
                  {currentStep.details && (
                    <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 gap-2.5">
                      {currentStep.details.map((detail, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[11.5px] font-mono text-[#d7a76c]/90 font-medium">
                            {detail.label}
                          </span>
                          <span className="text-[12.5px] text-[#b7a99b] font-light">
                            {detail.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Step 2 Personalization: Turntable Platter Speed ── */}
                  {step === 1 && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <span className="text-[11px] font-mono text-[#d7a76c]/90 font-medium block mb-2">
                        Customize Default Rotation Speed
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            playTick()
                            setRpm('33')
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer border',
                            rpm === '33'
                              ? 'bg-[#d7a76c] text-[#14110e] border-[#d7a76c] font-bold shadow-[0_2px_8px_rgba(215,167,108,0.25)]'
                              : 'bg-white/[0.04] text-[#a89b8d] border-white/[0.08] hover:bg-white/[0.08] hover:text-[#f5efe6]'
                          )}
                        >
                          33 ⅓ RPM · LP Album
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTick()
                            setRpm('45')
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer border',
                            rpm === '45'
                              ? 'bg-[#d7a76c] text-[#14110e] border-[#d7a76c] font-bold shadow-[0_2px_8px_rgba(215,167,108,0.25)]'
                              : 'bg-white/[0.04] text-[#a89b8d] border-white/[0.08] hover:bg-white/[0.08] hover:text-[#f5efe6]'
                          )}
                        >
                          45 RPM · 7" / 12" Single
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 4 Personalization: Interactive Room Environment Switcher ── */}
                  {step === 3 && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <span className="text-[11px] font-mono text-[#d7a76c]/90 font-medium block mb-2">
                        Choose Your Listening Atmosphere
                      </span>
                      <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                        {LISTENING_ENVIRONMENTS.slice(0, 6).map((env) => {
                          const isSelected = theme === env.id
                          return (
                            <button
                              key={env.id}
                              type="button"
                              onClick={() => {
                                playTick()
                                setTheme(env.id)
                              }}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer group',
                                isSelected
                                  ? 'bg-[#d7a76c]/15 border-[#d7a76c] text-[#f5efe6]'
                                  : 'bg-white/[0.03] border-white/[0.06] text-[#a89b8d] hover:bg-white/[0.06] hover:text-[#f5efe6]'
                              )}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: env.accentColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-medium block truncate">
                                  {env.name}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Step 6 Personalization: Screensaver Lyric Preference ── */}
                  {step === 5 && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <span className="text-[11px] font-mono text-[#d7a76c]/90 font-medium block mb-2">
                        Screensaver Preference
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playTick()
                          toggleScreensaverLyrics()
                        }}
                        className={cn(
                          'flex items-center justify-between w-full px-3 py-2 rounded-lg border transition-all cursor-pointer',
                          screensaverLyrics
                            ? 'bg-[#d7a76c]/15 border-[#d7a76c] text-[#f5efe6]'
                            : 'bg-white/[0.03] border-white/[0.06] text-[#a89b8d] hover:bg-white/[0.06] hover:text-[#f5efe6]'
                        )}
                      >
                        <span className="text-[11.5px] font-medium">Show Live Lyrics on Screensaver</span>
                        <span
                          className={cn(
                            'text-[10px] font-mono uppercase px-1.5 py-0.5 rounded',
                            screensaverLyrics
                              ? 'bg-[#d7a76c] text-[#14110e] font-bold'
                              : 'bg-white/10 text-[#a89b8d]'
                          )}
                        >
                          {screensaverLyrics ? 'Active' : 'Muted'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#100d0a] flex items-center justify-between shrink-0">
          {/* Step Indicators */}
          <div className="flex items-center gap-1.5">
            {GUIDE_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                  i === step
                    ? 'w-6 bg-[#d7a76c]'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[#f5efe6] text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 border border-white/[0.06]"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#a89b8d]" />
                Previous
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={close}
                className="px-5 py-1.5 rounded-xl bg-[#d7a76c] hover:bg-[#e0b279] text-[#14110e] text-[12px] font-bold transition-all cursor-pointer shadow-[0_2px_12px_rgba(215,167,108,0.3)] active:scale-95"
              >
                Start Listening
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#f5efe6] text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 border border-white/[0.08]"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5 text-[#a89b8d]" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
