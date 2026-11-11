import React, { useEffect, useRef, useState } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { Accessibility, AppWindow, AudioLines, Disc3, Gauge, SlidersHorizontal, X } from 'lucide-react'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { loadGrowth, saveGrowth, whatsNewDecision } from './growth'
import { ReminderCards } from './ReminderCards'
import { tl, type MessageKey } from '@renderer/i18n'

const EASE = [0.22, 1, 0.36, 1] as const

/** This version's notes. Keep them short: what someone will notice, not how it was built. */
const WHATS_NEW: Array<{ icon: React.ComponentType<{ className?: string }>; title: MessageKey; text: MessageKey }> = [
  { icon: Gauge, title: 'whatsNew.smoother', text: 'whatsNew.smoother.text' },
  { icon: AppWindow, title: 'whatsNew.window', text: 'whatsNew.window.text' },
  { icon: SlidersHorizontal, title: 'whatsNew.lightAmount', text: 'whatsNew.lightAmount.text' },
  { icon: AudioLines, title: 'whatsNew.meter', text: 'whatsNew.meter.text' },
  { icon: Disc3, title: 'whatsNew.tonearm', text: 'whatsNew.tonearm.text' },
  { icon: Accessibility, title: 'whatsNew.comfort', text: 'whatsNew.comfort.text' }
]

/**
 * "What's new" once after an update, and the rare rating and support reminders
 * (ReminderCards). None appears over a study session, the Listening Display, onboarding or
 * another dialog.
 */
export function GrowthPrompts(): React.JSX.Element | null {
  const reduced = useReducedMotion()
  const whatsNew = usePlayerStore((s) => s.isWhatsNewOpen)
  const setWhatsNew = usePlayerStore((s) => s.setIsWhatsNewOpen)
  const [version, setVersion] = useState('')
  const busy = usePlayerStore(
    (s) => s.isOnboardingOpen || s.isSettingsOpen || s.isKeyboardHelpOpen || s.isListeningDisplay || s.isScreensaver || s.activeView === 'study'
  )
  const studying = useStudyStore((s) => s.active !== null)

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const state = loadGrowth(now)
    state.launches += 1
    const firstRun = usePlayerStore.getState().isOnboardingOpen
    void (async () => {
      const v = (await window.electron?.getAppVersion?.().catch(() => '')) || ''
      if (!alive) return
      const { show, next } = whatsNewDecision(state, v, firstRun)
      // Do not consume the update notice while it is blocked by another screen.
      // Fresh installs still establish their baseline without showing release notes.
      saveGrowth(show ? { ...next, lastSeenVersion: state.lastSeenVersion } : next)
      setVersion(v)
      if (show) setWhatsNew(true)
    })()
    return (): void => {
      alive = false
    }
  }, [setWhatsNew])

  const showWhatsNew = whatsNew && !busy && !studying
  const whatsNewRef = useRef<HTMLDivElement>(null)
  useDialogFocus(whatsNewRef, Boolean(showWhatsNew))

  useEffect(() => {
    if (!showWhatsNew || !version) return
    const state = loadGrowth(Date.now())
    saveGrowth({ ...state, lastSeenVersion: version })
  }, [showWhatsNew, version])

  return createPortal(
    <>
      <AnimatePresence>
        {showWhatsNew && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setWhatsNew(false)}
            />
            <motion.div
              ref={whatsNewRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="whats-new-title"
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[28px] border border-ink/[0.08] kissa-sheet shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
            >
              <button
                type="button"
                onClick={() => setWhatsNew(false)}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.08] hover:text-ink cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                aria-label={tl('a11y.close')}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="px-9 pb-2 pt-9">
                <p className="text-[12.5px] font-medium text-tone">{version ? tl('whatsNew.eyebrowVersion', { version }) : tl('whatsNew.eyebrow')}</p>
                <h2 id="whats-new-title" className="mt-3 font-kissa-editorial text-[34px] font-normal leading-[1.05] text-ink">
                  {tl('whatsNew.title')}
                </h2>
              </div>
              <ul className="max-h-[52vh] overflow-y-auto no-scrollbar px-9 py-5">
                {WHATS_NEW.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4 border-b border-ink/[0.06] py-4 last:border-b-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-tone">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{tl(title)}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">{tl(text)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 px-9 pb-8 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsNew(false)
                    useEditionsStore.getState().showEditor()
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-ink/[0.16] px-5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.07] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  {tl('whatsNew.turntable')}
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsNew(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-tone px-6 text-[13px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_rgba(0,0,0,0.35)] cursor-pointer transition-[filter,transform] hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  {tl('whatsNew.back')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReminderCards />
    </>,
    document.body
  )
}
