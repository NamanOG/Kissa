import React, { useEffect, useRef, useState } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Disc3, Gauge, Layers, Library, Star, Volume2, X } from 'lucide-react'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { afterRatingAnswer, loadGrowth, saveGrowth, shouldAskForRating, whatsNewDecision } from './growth'
import { tl } from '@renderer/i18n'

const EASE = [0.22, 1, 0.36, 1] as const

/** This version's notes. Keep them short: what someone will notice, not how it was built. */
const WHATS_NEW: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; text: string }> = [
  {
    icon: Disc3,
    title: 'Your turntable',
    text: 'Choose a finish (Original walnut, Porcelain lacquer or brushed Studio Silver) and a record pressing, and save the looks you like. Open it from the sidebar, the nameplate on the deck, or the E key.'
  },
  {
    icon: Layers,
    title: 'Special pressings',
    text: 'Marble in three colours, Tortoiseshell and Splatter, alongside the plain colours. You can change the record from the Focus Room too.'
  },
  {
    icon: Library,
    title: 'The Record Crate',
    text: 'Flip through your Shelf one sleeve at a time, like a crate of records, with the wheel or arrow keys.'
  },
  {
    icon: Volume2,
    title: 'Crisper controls',
    text: 'The power switch, speed keys, Start and Stop and the needle now have short, mechanical sounds modelled on real parts.'
  },
  {
    icon: Gauge,
    title: 'Smoother track changes',
    text: 'Changing songs with Match the album no longer makes the app stutter. A new Moving light option lets the album colours drift slowly behind the room.'
  }
]

const FIRST_ASK_DELAY_MS = 45_000

/**
 * "What's new" once after an update, and, for the Store build, a rare request for a
 * rating. Neither appears over a study session, the Listening Display, onboarding or
 * another dialog.
 */
export function GrowthPrompts(): React.JSX.Element | null {
  const reduced = useReducedMotion()
  const whatsNew = usePlayerStore((s) => s.isWhatsNewOpen)
  const setWhatsNew = usePlayerStore((s) => s.setIsWhatsNewOpen)
  const [version, setVersion] = useState('')
  const [askRating, setAskRating] = useState(false)
  const busy = usePlayerStore(
    (s) => s.isOnboardingOpen || s.isSettingsOpen || s.isKeyboardHelpOpen || s.isListeningDisplay || s.isScreensaver || s.activeView === 'study'
  )
  const studying = useStudyStore((s) => s.active !== null)

  useEffect(() => {
    let alive = true
    let ratingTimer: number | undefined
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
      const status = await window.electron?.getUpdateStatus?.().catch(() => null)
      if (!alive || !status?.isStoreManaged || show) return
      if (shouldAskForRating(next, Date.now())) {
        ratingTimer = window.setTimeout(() => alive && setAskRating(true), FIRST_ASK_DELAY_MS)
      }
    })()
    return (): void => {
      alive = false
      window.clearTimeout(ratingTimer)
    }
  }, [setWhatsNew])

  const answerRating = (answer: 'rate' | 'later' | 'never'): void => {
    setAskRating(false)
    saveGrowth(afterRatingAnswer(loadGrowth(Date.now()), answer, Date.now()))
    if (answer === 'rate') void window.electron?.openStoreReview?.()
  }

  const showWhatsNew = whatsNew && !busy && !studying
  const whatsNewRef = useRef<HTMLDivElement>(null)
  useDialogFocus(whatsNewRef, Boolean(showWhatsNew))
  const showRating = askRating && !whatsNew && !busy && !studying

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
                <p className="text-[12.5px] font-medium text-tone">What&apos;s new{version ? ` in ${version}` : ''}</p>
                <h2 id="whats-new-title" className="mt-3 font-kissa-editorial text-[34px] font-normal leading-[1.05] text-ink">
                  New in the listening room
                </h2>
              </div>
              <ul className="max-h-[52vh] overflow-y-auto no-scrollbar px-9 py-5">
                {WHATS_NEW.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4 border-b border-ink/[0.06] py-4 last:border-b-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-tone">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">{text}</p>
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
                  Choose your turntable
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsNew(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-tone px-6 text-[13px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_rgba(0,0,0,0.35)] cursor-pointer transition-[filter,transform] hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  Back to the music
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRating && (
          <motion.div
            role="dialog"
            aria-label={tl('a11y.rate')}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed bottom-28 right-6 z-[70] w-[340px] rounded-[22px] border border-ink/[0.08] kissa-sheet p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tone/15 text-tone">
                <Star className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink">Enjoying Kissa?</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                  A rating on the Microsoft Store helps other people find it. It takes a few seconds.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => answerRating('rate')}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-tone text-[12px] font-bold text-[var(--surface)] cursor-pointer active:scale-[0.98]"
              >
                Rate Kissa
              </button>
              <button
                type="button"
                onClick={() => answerRating('later')}
                className="inline-flex h-9 items-center justify-center rounded-full px-3.5 text-[12px] font-semibold text-dim hover:text-ink cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => answerRating('never')}
                className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[12px] font-semibold text-dim hover:text-ink cursor-pointer"
              >
                No thanks
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
