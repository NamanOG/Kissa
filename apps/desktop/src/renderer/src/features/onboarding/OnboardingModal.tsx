import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export interface OnboardingModalProps {
  className?: string
}

const STEPS = [
  {
    id: 'deck',
    label: 'THE DECK',
    body: 'Kissa visually follows the currently detected or playing music through the turntable.',
    targetSelector: '.onboarding-deck'
  },
  {
    id: 'tonearm',
    label: 'THE TONEARM',
    body: 'Drag the tonearm across the record to seek.',
    targetSelector: '.onboarding-tonearm'
  },
  {
    id: 'match-album',
    label: 'MATCH ALBUM',
    body: 'Let the listening environment adapt to the artwork.',
    targetSelector: '.onboarding-match-album'
  },
  {
    id: 'lyrics',
    label: 'LYRICS',
    body: 'Open synced lyrics and click any line to seek.',
    targetSelector: '.onboarding-lyrics'
  }
]

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const [step, setStep] = useState<number>(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isOnboardingOpen) return
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
      if (e.key === 'Escape') setIsOnboardingOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOnboardingOpen, step, setIsOnboardingOpen])

  useEffect(() => {
    if (!isOnboardingOpen) return
    
    // Clean up previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight')
    })

    // Add highlight to current target
    const currentStep = STEPS[step]
    if (currentStep && currentStep.targetSelector) {
      const el = document.querySelector(currentStep.targetSelector)
      if (el) {
        el.classList.add('onboarding-highlight')
      }
    }

    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight')
      })
    }
  }, [isOnboardingOpen, step])

  if (!isOnboardingOpen) return null

  const close = (): void => setIsOnboardingOpen(false)
  const currentStep = STEPS[step]

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] pointer-events-none flex items-end justify-center pb-24 select-none',
        className
      )}
    >
      {/* Dim backdrop to make highlights pop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-[#0a0806]/80 backdrop-blur-sm pointer-events-auto"
        onClick={close}
      />

      {/* Manual Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-50 w-[380px] rounded-lg bg-[#191512] border border-[#2a241e] shadow-[0_16px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden pointer-events-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a241e]/50 bg-[#14110e]">
          <span className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-[#8e8175]">
            Hardware Manual — {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={close}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[#8e8175] hover:text-[#d7a76c] transition-colors"
            title="Skip Intro"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 h-[120px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <h3 className="font-serif text-lg text-[#e6dbcf] leading-none mb-2">
                {currentStep.label}
              </h3>
              <p className="text-[12.5px] font-light text-[#a89b8d] leading-relaxed">
                {currentStep.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a241e]/50 bg-[#14110e]">
          <button
            type="button"
            onClick={close}
            className="text-[11px] font-medium text-[#8e8175] hover:text-white transition-colors"
          >
            SKIP INTRO
          </button>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="w-7 h-7 rounded border border-[#2a241e] flex items-center justify-center text-[#8e8175] hover:text-[#d7a76c] hover:border-[#d7a76c]/30 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="w-7 h-7 rounded border border-[#2a241e] flex items-center justify-center text-[#8e8175] hover:text-[#d7a76c] hover:border-[#d7a76c]/30 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="px-3 h-7 rounded bg-[#2a241e] text-[11px] font-bold text-[#e6dbcf] hover:bg-[#3a3229] transition-colors uppercase tracking-wider"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Global styles for highlights */}
      <style>{`
        .onboarding-highlight {
          position: relative !important;
          z-index: 150 !important;
          pointer-events: auto !important;
          filter: drop-shadow(0 0 16px rgba(215, 167, 108, 0.4));
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
