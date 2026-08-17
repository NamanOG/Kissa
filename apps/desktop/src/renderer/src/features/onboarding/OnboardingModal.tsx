import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle2, Volume2, Disc, Quote } from 'lucide-react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { cn } from '@renderer/utils/cn'
import kissaHeroImg from '@renderer/media/kissa_welcome_hero.jpg'

export interface OnboardingModalProps {
  className?: string
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const currentTheme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)

  const [currentStep, setCurrentStep] = useState<number>(0)

  const steps = [
    { id: 'ritual', number: '01', title: 'The Ritual' },
    { id: 'deck', number: '02', title: 'The Deck' },
    { id: 'atmosphere', number: '03', title: 'Atmospheres' }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOnboardingOpen) {
        setIsOnboardingOpen(false)
      } else if (e.key === 'ArrowRight' && isOnboardingOpen && currentStep < 2) {
        setCurrentStep((s) => s + 1)
      } else if (e.key === 'ArrowLeft' && isOnboardingOpen && currentStep > 0) {
        setCurrentStep((s) => s - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOnboardingOpen, currentStep, setIsOnboardingOpen])

  if (!isOnboardingOpen) return null

  const handleFinish = (): void => {
    setIsOnboardingOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-[640px]:p-8 select-none font-sans">
      {/* Dark Ambient Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-2xl"
        onClick={handleFinish}
      />

      {/* Editorial Modal Surface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative z-50 w-full max-w-[680px] max-h-[90vh] flex flex-col rounded-3xl border border-white/[0.1] bg-[#14100e] shadow-[0_32px_80px_rgba(0,0,0,0.85)] overflow-hidden',
          className
        )}
      >
        {/* Top Photographic Header */}
        <div className="relative h-44 min-[640px]:h-48 w-full overflow-hidden shrink-0 bg-[#120d0b]">
          <img
            src={kissaHeroImg}
            alt="Japanese Jazz Kissa Listening Bar"
            className="w-full h-full object-cover object-center brightness-[0.85] contrast-[1.05]"
          />

          {/* Smooth Gradient Fades */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14100e] via-[#14100e]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14100e]/70 via-transparent to-[#14100e]/50" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center text-[#d6c9bb] bg-black/40 hover:bg-black/70 hover:text-white border border-white/[0.1] backdrop-blur-md transition-all cursor-pointer"
            title="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Clean Header Title with Cormorant Garamond */}
          <div className="absolute bottom-3.5 left-7 right-7 z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-[#d7a76c] font-medium">
                喫茶 • JAZZ KISSA
              </span>
            </div>
            <h1 className="font-serif text-3xl min-[640px]:text-4xl text-[#f5efe6] font-normal tracking-wide leading-tight">
              Welcome to Kissa
            </h1>
          </div>
        </div>

        {/* Minimal Stepper Bar */}
        <div className="flex items-center justify-between px-7 py-2.5 border-y border-white/[0.06] bg-[#191412] shrink-0">
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => {
              const isActive = currentStep === idx
              const isPast = currentStep > idx
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer',
                    isActive
                      ? 'bg-[#d7a76c]/15 text-[#f5efe6] font-medium border border-[#d7a76c]/40'
                      : isPast
                        ? 'text-[#d7a76c] hover:bg-white/[0.03]'
                        : 'text-[#7e7268] hover:text-[#b7a99b]'
                  )}
                >
                  <span className="font-mono text-[10px] opacity-75">{step.number}</span>
                  <span className="text-[11.5px] font-sans">{step.title}</span>
                </button>
              )
            })}
          </div>

          <span className="font-mono text-[11px] text-[#887b70]">
            {currentStep + 1} / 3
          </span>
        </div>

        {/* Main Content Area — Airy & Spacious */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-7 space-y-6">
          {/* ═════════ STEP 1: THE RITUAL ═════════ */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <h3 className="font-serif text-2xl text-[#f5efe6] font-normal tracking-wide">
                  How sound enters the room
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b] leading-relaxed font-light">
                  Kissa listens to your favorite desktop music player and creates an analog vinyl sanctuary on your screen.
                </p>
              </div>

              {/* 3 Clean Minimal Cards */}
              <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">01 • PLAY</span>
                    <Volume2 className="w-3.5 h-3.5 text-[#887b70]" />
                  </div>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">Play Any Music</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Start a song in Spotify, Apple Music, Tidal, or YouTube on Windows.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">02 • SYNC</span>
                    <Disc className="w-3.5 h-3.5 text-[#d7a76c]" />
                  </div>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">Platter Spins Live</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Kissa auto-detects playback, prints cover art on vinyl, and drops the needle.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">03 • UNWIND</span>
                    <Quote className="w-3.5 h-3.5 text-[#887b70]" />
                  </div>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">Synced Lyrics & Mood</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Sit back with warm ambient lighting and real-time karaoke lyrics.
                  </p>
                </div>
              </div>

              {/* Clean minimal footer tip */}
              <p className="text-[11.5px] text-[#887b70] pt-1 leading-relaxed font-light">
                <strong className="text-[#d7a76c] font-medium font-sans">Offline Demo:</strong> When no music is playing, Kissa plays an offline record (<em>Self Control — Frank Ocean</em>) so you can test the deck anytime.
              </p>
            </motion.div>
          )}

          {/* ═════════ STEP 2: THE DECK ═════════ */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <h3 className="font-serif text-2xl text-[#f5efe6] font-normal tracking-wide">
                  Tactile deck mechanics
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b] leading-relaxed font-light">
                  Every interaction is engineered with physical weight, needle acoustics, and analog inertia.
                </p>
              </div>

              <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">TONEARM</span>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">Interactive Needle Drops</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Click anywhere on the platter to drop the tonearm and seek track time with vinyl clicks.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">MOTOR</span>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">33⅓ & 45 RPM Speed Dial</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Switch between LP 33⅓ and 45 RPM speeds on the plinth with realistic motor inertia.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] space-y-2">
                  <span className="font-mono text-[9.5px] text-[#d7a76c] font-medium tracking-wider">LYRICS</span>
                  <h4 className="text-xs font-medium text-[#f5efe6] font-sans">Apple Music Synced Lyrics</h4>
                  <p className="text-[11.5px] text-[#887b70] leading-relaxed font-light">
                    Click the <strong>Quote (")</strong> icon in the sidebar for full-screen lyrics with optical depth blur.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═════════ STEP 3: ATMOSPHERES ═════════ */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <h3 className="font-serif text-2xl text-[#f5efe6] font-normal tracking-wide">
                  Select your listening environment
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b] font-light">
                  Choose a room atmosphere to suit your mood. Click any tile to set it:
                </p>
              </div>

              {/* Clean Atmosphere Grid */}
              <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-2.5 pt-1">
                {LISTENING_ENVIRONMENTS.map((theme) => {
                  const isSelected = currentTheme === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setTheme(theme.id as AppTheme)}
                      className={cn(
                        'group relative flex flex-col rounded-2xl overflow-hidden border p-2 text-left transition-all cursor-pointer active:scale-95',
                        isSelected
                          ? 'border-[#d7a76c] bg-[#d7a76c]/15 shadow-[0_0_16px_rgba(215,167,108,0.25)]'
                          : 'border-white/[0.07] bg-white/[0.01] hover:border-white/[0.18] hover:bg-white/[0.03]'
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/40">
                        <img
                          src={theme.image}
                          alt={theme.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#d7a76c] text-[#14100e] flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className="font-mono text-[9px] text-[#887b70] uppercase tracking-wider">
                          {theme.number}
                        </span>
                        <h4 className="text-[11.5px] font-medium text-[#f5efe6] font-sans line-clamp-1">
                          {theme.name}
                        </h4>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Clean, Airy Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-white/[0.06] bg-[#181311] shrink-0">
          <div>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#b7a99b] hover:text-[#f5efe6] transition-all cursor-pointer font-sans"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-3 py-1.5 rounded-xl text-xs text-[#7e7268] hover:text-[#b7a99b] transition-all cursor-pointer font-sans"
              >
                Skip Guide
              </button>
            )}
          </div>

          <div>
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-[#14100e] bg-[#d7a76c] hover:bg-[#e4b982] shadow-[0_2px_12px_rgba(215,167,108,0.25)] transition-all cursor-pointer active:scale-95 font-sans"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-[#14100e] bg-[#d7a76c] hover:bg-[#e4b982] shadow-[0_4px_20px_rgba(215,167,108,0.35)] transition-all cursor-pointer active:scale-95 font-sans"
              >
                <span>Enter Kissa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
