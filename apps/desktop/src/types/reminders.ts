/**
 * Rating and support reminders: when Kissa may ask, kept in userData/reminders.json by the main
 * process. Pure functions only, shared by main (sanitising what is stored) and the renderer
 * (deciding when to ask).
 *
 * The rules, in short: only after real use, at most one card per app session, never twice in a
 * row after "Not now" without a long pause, and never again after the person rated or supported
 * Kissa or said "Don't ask again".
 */

const DAY = 24 * 60 * 60 * 1000

export type ReminderKind = 'rating' | 'support'
export type ReminderStatus = 'pending' | 'done' | 'never'

export interface ReminderCard {
  status: ReminderStatus
  /** Times this card has been shown. */
  asks: number
  /** Not before this time (ms since epoch). */
  nextAt: number
  /** When it was first shown, or 0. */
  firstAskedAt: number
}

export interface ReminderState {
  v: 1
  rating: ReminderCard
  support: ReminderCard
}

export interface ListeningUsage {
  /** Distinct local days with music heard. */
  days: number
  /** Seconds heard in all. */
  seconds: number
}

/** The thresholds, in one place so the numbers can be read and changed together. */
export const REMINDER_RULES = {
  rating: { minDays: 5, minHours: 3 },
  support: { minDays: 12, minHours: 10, afterRatingDays: 30 },
  /** "Not now" waits this long before the next ask: 14 days, then 30, then 60. */
  backoffDays: [14, 30, 60],
  maxAsks: 3
} as const

const freshCard = (): ReminderCard => ({ status: 'pending', asks: 0, nextAt: 0, firstAskedAt: 0 })

export function freshReminders(): ReminderState {
  return { v: 1, rating: freshCard(), support: freshCard() }
}

function cleanCard(raw: unknown): ReminderCard {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  const status: ReminderStatus = c.status === 'done' || c.status === 'never' ? c.status : 'pending'
  return { status, asks: Math.min(99, Math.floor(num(c.asks))), nextAt: num(c.nextAt), firstAskedAt: num(c.firstAskedAt) }
}

/** Anything read from disk or over IPC: unknown shapes become a fresh, harmless state. */
export function sanitizeReminders(raw: unknown): ReminderState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { v: 1, rating: cleanCard(r.rating), support: cleanCard(r.support) }
}

function cardOpen(card: ReminderCard, now: number): boolean {
  return card.status === 'pending' && card.asks < REMINDER_RULES.maxAsks && now >= card.nextAt
}

/**
 * Which card, if any, may be shown now. The rating comes first; support only once the rating
 * card has been out for a month and Kissa has been used a good deal more.
 */
export function reminderDue(state: ReminderState, usage: ListeningUsage, now: number): ReminderKind | null {
  const hours = usage.seconds / 3600
  const r = REMINDER_RULES
  if (cardOpen(state.rating, now) && usage.days >= r.rating.minDays && hours >= r.rating.minHours) return 'rating'
  const ratingOut = state.rating.firstAskedAt > 0 && now - state.rating.firstAskedAt >= r.support.afterRatingDays * DAY
  if (ratingOut && cardOpen(state.support, now) && usage.days >= r.support.minDays && hours >= r.support.minHours) {
    return 'support'
  }
  return null
}

/** The card was put on screen. */
export function markShown(state: ReminderState, kind: ReminderKind, now: number): ReminderState {
  const card = state[kind]
  return { ...state, [kind]: { ...card, asks: card.asks + 1, firstAskedAt: card.firstAskedAt || now } }
}

/**
 * The answer to a card. "Done" (rated or supported) and "never" end it for good; "later" waits
 * 14, 30, then 60 days, counted from the number of times it has been shown.
 */
export function answerReminder(
  state: ReminderState,
  kind: ReminderKind,
  answer: 'done' | 'later' | 'never',
  now: number
): ReminderState {
  const card = state[kind]
  if (answer !== 'later') return { ...state, [kind]: { ...card, status: answer } }
  const steps = REMINDER_RULES.backoffDays
  const wait = steps[Math.min(steps.length - 1, Math.max(0, card.asks - 1))]
  return { ...state, [kind]: { ...card, nextAt: now + wait * DAY } }
}
