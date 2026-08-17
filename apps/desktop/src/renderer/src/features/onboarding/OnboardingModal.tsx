import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle2, Sliders, Volume2 } from 'lucide-react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { cn } from '@renderer/utils/cn'
import kissaHeroImg from '@renderer/media/kissa_welcome_hero.jpg'
import phonoLogo from '@renderer/media/phono_logo.png'

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
    { id: 'ritual', number: '01', title: 'The Ritual', kanji: '作法', desc: 'How Kissa Works' },
    { id: 'anatomy', number: '02', title: 'The Deck', kanji: '構造', desc: 'Tonearm & Synced Lyrics' },
    { id: 'sanctuary', number: '03', title: 'Atmosphere', kanji: '空間', desc: 'Pick Your Mood' }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 min-[640px]:p-6 select-none">
      {/* Dark Ambient Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-[#090706]/85 backdrop-blur-2xl"
        onClick={() => setIsOnboardingOpen(false)}
      />

      {/* Editorial Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative z-50 w-full max-w-[740px] max-h-[92vh] flex flex-col rounded-3xl border border-white/[0.14] bg-[#14100e] shadow-[0_32px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden',
          className
        )}
      >
        {/* Top Hero Image Banner with Subtle Gradient Overlays */}
        <div className="relative h-44 min-[640px]:h-52 w-full overflow-hidden shrink-0 bg-[#120d0b]">
          <img
            src={kissaHeroImg}
            alt="Japanese Jazz Kissa Listening Room"
            className="w-full h-full object-cover object-center brightness-90 filter contrast-[1.05]"
          />

          {/* Vignette & Ambient Gradient Fades */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14100e] via-[#14100e]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14100e]/80 via-transparent to-[#14100e]/60" />

          {/* Top Bar Floating Controls */}
          <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1]">
              <div className="w-4 h-4 rounded-full overflow-hidden border border-[#d7a76c]/60">
                <img src={phonoLogo} alt="Kissa" className="w-full h-full object-cover" />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#d7a76c] font-semibold">
                KISSA LINER NOTES • 喫茶のしおり
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#d6c9bb] bg-black/50 hover:bg-black/80 hover:text-white border border-white/[0.1] backdrop-blur-md transition-all cursor-pointer"
              title="Close Guide (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hero Typography Overlay */}
          <div className="absolute bottom-3 left-6 right-6 z-10 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-serif text-xs text-[#d7a76c] tracking-widest italic">
                  ジャズ喫茶
                </span>
                <span className="text-[10px] text-[#887b70]">•</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#b7a99b]">
                  ANALOG DESKTOP ENVIRONMENT
                </span>
              </div>
              <h1 className="font-serif text-2xl min-[640px]:text-3xl text-[#f5efe6] font-medium tracking-tight">
                Welcome to Kissa
              </h1>
            </div>
            <div className="hidden min-[640px]:block text-right">
              <span className="font-mono text-[10px] text-[#887b70] tracking-wider uppercase">
                ISSUE 01 • VOL. 1
              </span>
            </div>
          </div>
        </div>

        {/* Tactile Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2 border-y border-white/[0.08] bg-[#1a1411]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-[640px]:gap-3">
            {steps.map((step, idx) => {
              const isActive = currentStep === idx
              const isPast = currentStep > idx
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer',
                    isActive
                      ? 'bg-[#d7a76c]/20 border border-[#d7a76c]/50 text-[#f5efe6] shadow-[0_0_12px_rgba(215,167,108,0.2)]'
                      : isPast
                        ? 'text-[#d7a76c] hover:bg-white/[0.04]'
                        : 'text-[#887b70] hover:text-[#b7a99b]'
                  )}
                >
                  <span className="font-mono text-[10px] opacity-75 font-semibold">
                    {step.number}
                  </span>
                  <span className="font-medium tracking-wide">
                    {step.title}
                  </span>
                  <span className="hidden min-[640px]:inline font-serif text-[10px] opacity-50 italic">
                    {step.kanji}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="font-mono text-[10px] text-[#a99b90]">
            {currentStep + 1} / 3
          </div>
        </div>

        {/* Editorial Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* ═════════ STEP 1: THE RITUAL / HOW IT WORKS ═════════ */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                  CHAPTER I • THE RITUAL (作法)
                </span>
                <h3 className="font-serif text-xl text-[#f5efe6] font-medium tracking-tight">
                  How sound enters the room
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b] leading-relaxed">
                  Named after Japan’s contemplative *Jazz Kissa* listening bars, Kissa is an audio companion that brings physical vinyl mechanics and ambient room lighting to your desktop.
                </p>
              </div>

              {/* Hardware Signal Flow Schematic Card */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#887b70]">
                    SIGNAL FLOW & DETECTION
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#d7a76c]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d7a76c] animate-pulse" />
                    LIVE SMTC ENGINE
                  </span>
                </div>

                <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3 pt-1">
                  {/* Step A */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-[#d7a76c] font-bold">01 • INPUT</span>
                      <Volume2 className="w-3.5 h-3.5 text-[#887b70]" />
                    </div>
                    <div className="text-xs font-medium text-[#f5efe6]">Play on Spotify or Apple Music</div>
                    <p className="text-[11px] text-[#887b70] leading-relaxed">
                      Simply start your music in any Windows app (Spotify, Apple Music, Tidal, Chrome).
                    </p>
                  </div>

                  {/* Step B */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-[#d7a76c] font-bold">02 • TRACKING</span>
                      <Sliders className="w-3.5 h-3.5 text-[#d7a76c]" />
                    </div>
                    <div className="text-xs font-medium text-[#f5efe6]">Instant Analog Platter Sync</div>
                    <p className="text-[11px] text-[#887b70] leading-relaxed">
                      Kissa detects the track live, printing cover art on the vinyl and tracking the tonearm.
                    </p>
                  </div>

                  {/* Step C */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-[#d7a76c] font-bold">03 • IMMERSION</span>
                      <span className="font-serif text-xs text-[#d7a76c] italic">33⅓</span>
                    </div>
                    <div className="text-xs font-medium text-[#f5efe6]">Atmosphere & Synced Lyrics</div>
                    <p className="text-[11px] text-[#887b70] leading-relaxed">
                      Sit back with warm lighting, live synchronized lyrics, and tactile needle drops.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note on Built-in Demo */}
              <div className="px-4 py-3 rounded-xl border border-[#d7a76c]/30 bg-[#d7a76c]/[0.07] flex items-center justify-between text-xs text-[#d7a76c]">
                <span>
                  <strong>Offline Turntable:</strong> No music playing right now? Kissa includes an offline demo vinyl (<em>Self Control — Frank Ocean</em>) so you can test the tonearm immediately.
                </span>
              </div>
            </motion.div>
          )}

          {/* ═════════ STEP 2: PHYSICAL DECK & LYRICS ═════════ */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                  CHAPTER II • THE DECK (構造)
                </span>
                <h3 className="font-serif text-xl text-[#f5efe6] font-medium tracking-tight">
                  Tactile controls & precision tonearm
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b] leading-relaxed">
                  Every interaction is engineered with physical weight, rotational inertia, and authentic acoustic feedback.
                </p>
              </div>

              <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3">
                {/* Feature 1: Tonearm */}
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#d7a76c]">
                    01 • TONEARM (トーンアーム)
                  </span>
                  <h4 className="text-xs font-semibold text-[#f5efe6]">Interactive Needle Scrubbing</h4>
                  <p className="text-[11px] text-[#887b70] leading-relaxed">
                    Click anywhere on the platter or drag the scrub slider. The tonearm lifts and drops onto record grooves with genuine vinyl surface clicks.
                  </p>
                </div>

                {/* Feature 2: Speed */}
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#d7a76c]">
                    02 • MOTOR (回転数)
                  </span>
                  <h4 className="text-xs font-semibold text-[#f5efe6]">33⅓ & 45 RPM Speed Dial</h4>
                  <p className="text-[11px] text-[#887b70] leading-relaxed">
                    Switch between 33⅓ RPM LP albums and 45 RPM singles. The machined aluminum platter accelerates and coasts with physical rotational inertia.
                  </p>
                </div>

                {/* Feature 3: Synced Lyrics */}
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 space-y-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#d7a76c]">
                    03 • LYRICS (歌詞同期)
                  </span>
                  <h4 className="text-xs font-semibold text-[#f5efe6]">Apple Music-Grade Karaoke</h4>
                  <p className="text-[11px] text-[#887b70] leading-relaxed">
                    Click the <strong>Quote icon (")</strong> on the left rail for full-screen lyrics with dynamic depth-of-field blur and click-to-seek playback.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═════════ STEP 3: CHOOSE YOUR ATMOSPHERE ═════════ */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d7a76c] font-bold">
                  CHAPTER III • ATMOSPHERE (空間)
                </span>
                <h3 className="font-serif text-xl text-[#f5efe6] font-medium tracking-tight">
                  Select your listening environment
                </h3>
                <p className="text-xs min-[640px]:text-sm text-[#b7a99b]">
                  Choose a sanctuary for your desktop. Click any atmosphere to preview it immediately:
                </p>
              </div>

              {/* Atmosphere Grid */}
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
                          ? 'border-[#d7a76c] bg-[#d7a76c]/15 shadow-[0_0_20px_rgba(215,167,108,0.35)]'
                          : 'border-white/[0.08] bg-black/30 hover:border-white/[0.2] hover:bg-white/[0.04]'
                      )}
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/50">
                        <img
                          src={theme.image}
                          alt={theme.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#d7a76c] text-[#14100e] flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className="font-mono text-[9px] text-[#a99b90] uppercase tracking-wider">
                          {theme.number}
                        </span>
                        <h4 className="text-[11px] font-medium text-[#f5efe6] line-clamp-1">
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

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#1a1411] shrink-0">
          <div>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#b7a99b] hover:text-[#f5efe6] hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#887b70] hover:text-[#b7a99b] transition-all cursor-pointer"
              >
                Skip Guide
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-medium text-[#14100e] bg-[#d7a76c] hover:bg-[#e4b982] shadow-[0_4px_16px_rgba(215,167,108,0.3)] transition-all cursor-pointer active:scale-95 font-semibold"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d7a76c] via-[#e4b982] to-[#d7a76c] hover:brightness-110 shadow-[0_4px_24px_rgba(215,167,108,0.45)] transition-all cursor-pointer active:scale-95"
              >
                <span>Enter the Listening Room (喫茶に入る)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
