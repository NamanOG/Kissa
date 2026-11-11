import { SPRING_CARD } from '@renderer/utils/motion'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { Heart, Star } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { useT } from '@renderer/i18n'
import { SUPPORT_PAGE_URL, openSupportPage } from '../support/SupportKissaLink'
import { loadGrowth } from './growth'
import { listeningUsage } from './usage'
import {
  answerReminder,
  freshReminders,
  markShown,
  reminderDue,
  sanitizeReminders,
  type ReminderKind,
  type ReminderState
} from '../../../../types/reminders'

/** The classic (GitHub) build cannot open the Store's review sheet, so it opens Kissa's Store page. */
const STORE_WEB_URL = 'https://apps.microsoft.com/detail/9p3n4x4wm80j'
/** The first look waits until the app has settled after opening. */
const FIRST_LOOK_MS = 60_000
/** After a song ends, a short pause so the card never lands on the first notes of the next. */
const AFTER_TRACK_MS = 4_000

/** At most one reminder card per app session, whatever happens. */
let shownThisSession = false
/** For tests. */
export function resetReminderSession(): void {
  shownThisSession = false
}

/** Carry over an answer given to the older Store-only rating prompt (kept in localStorage). */
function migrate(): ReminderState {
  const state = freshReminders()
  try {
    const legacy = loadGrowth(Date.now()).rating
    if (legacy === 'done' || legacy === 'never') state.rating.status = legacy
  } catch {
    /* nothing to carry over */
  }
  return state
}

/**
 * A quiet card above the dock asking, rarely, for a rating and, much more rarely, for support.
 * Only after real use (types/reminders.ts holds the numbers), never over Focus, Party, full
 * screen, the screensaver, onboarding, Settings or another dialog, and only while the window is
 * on screen: shortly after opening or just after a song ends.
 */
export function ReminderCards(): React.JSX.Element | null {
  const t = useT()
  const reduced = useReducedMotion()
  const [card, setCard] = useState<ReminderKind | null>(null)
  const [isStore, setIsStore] = useState<boolean | null>(null)
  const stateRef = useRef<ReminderState | null>(null)

  const busy = usePlayerStore(
    (s) =>
      s.isOnboardingOpen ||
      s.isSettingsOpen ||
      s.isKeyboardHelpOpen ||
      s.isListeningDisplay ||
      s.isScreensaver ||
      s.isFullscreen ||
      s.isPartyMode ||
      s.isWhatsNewOpen ||
      s.activeView === 'study'
  )
  const studying = useStudyStore((s) => s.active !== null)

  const save = useCallback((next: ReminderState): void => {
    stateRef.current = next
    void window.electron?.setReminders?.(next)
  }, [])

  const show = useCallback(
    (kind: ReminderKind): void => {
      const state = stateRef.current ?? freshReminders()
      shownThisSession = true
      save(markShown(state, kind, Date.now()))
      setCard(kind)
    },
    [save]
  )

  // Load the stored answers once; the build decides where "Rate" leads.
  useEffect(() => {
    let alive = true
    void (async () => {
      const raw = await window.electron?.getReminders?.().catch(() => null)
      if (!alive) return
      if (raw) stateRef.current = sanitizeReminders(raw)
      else save(migrate())
      const status = await window.electron?.getUpdateStatus?.().catch(() => null)
      if (alive) setIsStore(Boolean(status?.isStoreManaged))
    })()
    return () => {
      alive = false
    }
  }, [save])

  // Dev only: window.__kissaReminder('rating' | 'support') shows a card at once, for screenshots.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __kissaReminder?: (kind: ReminderKind) => void }
    w.__kissaReminder = (kind) => setCard(kind)
    return () => {
      delete w.__kissaReminder
    }
  }, [])

  // Look on opening (after a minute) and just after each song ends.
  useEffect(() => {
    if (isStore === null) return
    const look = (): void => {
      const state = stateRef.current
      const p = usePlayerStore.getState()
      if (!state || shownThisSession || card) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (
        p.isOnboardingOpen ||
        p.isSettingsOpen ||
        p.isKeyboardHelpOpen ||
        p.isListeningDisplay ||
        p.isScreensaver ||
        p.isFullscreen ||
        p.isPartyMode ||
        p.isWhatsNewOpen ||
        p.activeView === 'study' ||
        useStudyStore.getState().active !== null
      ) {
        return
      }
      // Nothing could be due whatever the usage (answered, waiting, or asked enough): skip
      // reading the listening history, which would otherwise be parsed after every song.
      const now = Date.now()
      if (!reminderDue(state, { days: Infinity, seconds: Infinity }, now)) return
      let due = reminderDue(state, listeningUsage(), now)
      if (due === 'support' && !SUPPORT_PAGE_URL) due = null
      if (due) show(due)
    }
    let pending: number | undefined
    const first = window.setTimeout(look, FIRST_LOOK_MS)
    let lastKey = ''
    const unsubscribe = usePlayerStore.subscribe((s) => {
      const key = s.currentTrack ? `${s.currentTrack.title}\u0000${s.currentTrack.artist}` : ''
      if (key === lastKey) return
      const changed = lastKey !== ''
      lastKey = key
      if (!changed) return
      window.clearTimeout(pending)
      pending = window.setTimeout(look, AFTER_TRACK_MS)
    })
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(pending)
      unsubscribe()
    }
  }, [isStore, card, show])

  const answer = (kind: ReminderKind, choice: 'done' | 'later' | 'never'): void => {
    setCard(null)
    save(answerReminder(stateRef.current ?? freshReminders(), kind, choice, Date.now()))
    if (choice !== 'done') return
    if (kind === 'support') openSupportPage()
    else if (isStore) void window.electron?.openStoreReview?.()
    else if (window.electron?.openExternal) void window.electron.openExternal(STORE_WEB_URL)
    else window.open(STORE_WEB_URL, '_blank', 'noopener,noreferrer')
  }

  // Esc is "Not now".
  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      answer(card, 'later')
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const visible = card !== null && !busy && !studying
  const rating = card === 'rating'
  const Icon = rating ? Star : Heart
  const title = rating ? t('reminder.rate.title') : t('reminder.support.title')
  const body = rating
    ? t('reminder.rate.body')
    : t('reminder.support.body')
  const action = rating
    ? t('reminder.rate.action')
    : t('reminder.support.action')

  return createPortal(
    <AnimatePresence>
      {visible && card && (
        <motion.div
          key={card}
          role="dialog"
          aria-labelledby="kissa-reminder-title"
          aria-describedby="kissa-reminder-body"
          data-reminder={card}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={reduced ? { duration: 0.2 } : SPRING_CARD}
          style={{ transformOrigin: 'bottom right' }}
          className="kissa-sheet fixed bottom-[108px] right-6 z-[70] w-[360px] overflow-hidden rounded-[22px] border border-panel-line p-4 pr-4 shadow-[var(--panel-shadow)]"
        >
          <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tone/[0.14] text-tone">
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p id="kissa-reminder-title" className="font-serif text-[17px] leading-tight text-ink">
                {title}
              </p>
              <p id="kissa-reminder-body" className="mt-1 text-[12.5px] leading-snug text-dim">
                {body}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 pl-[50px]">
            <button
              type="button"
              onClick={() => answer(card, 'never')}
              className="mr-auto h-8 cursor-pointer rounded-full px-1 text-[11.5px] text-dim/80 transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-tone/60"
            >
              {t('reminder.never')}
            </button>
            <button
              type="button"
              onClick={() => answer(card, 'later')}
              className="h-8 cursor-pointer rounded-full px-3 text-[12px] font-medium text-ink/80 transition-colors hover:bg-ink/[0.08] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-tone/60"
            >
              {t('reminder.later')}
            </button>
            <button
              type="button"
              onClick={() => answer(card, 'done')}
              className="h-8 cursor-pointer rounded-full bg-tone px-3.5 text-[12px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-[filter,transform] hover:brightness-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-tone/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg)]"
            >
              {action}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
