import { describe, expect, it } from 'vitest'
import {
  REMINDER_RULES,
  answerReminder,
  freshReminders,
  markShown,
  reminderDue,
  sanitizeReminders,
  type ListeningUsage
} from '../../../../../types/reminders'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 3600
const light: ListeningUsage = { days: 4, seconds: 10 * HOUR }
const real: ListeningUsage = { days: 5, seconds: 3 * HOUR }
const heavy: ListeningUsage = { days: 12, seconds: 10 * HOUR }

describe('rating reminder', () => {
  it('waits for real use: five listening days and three hours', () => {
    const s = freshReminders()
    expect(reminderDue(s, light, 0)).toBeNull()
    expect(reminderDue(s, { days: 9, seconds: 2.9 * HOUR }, 0)).toBeNull()
    expect(reminderDue(s, real, 0)).toBe('rating')
  })

  it('"Not now" backs off 14, then 30 days, and stops after three asks', () => {
    let s = markShown(freshReminders(), 'rating', 0)
    s = answerReminder(s, 'rating', 'later', 0)
    expect(reminderDue(s, real, 13 * DAY)).toBeNull()
    expect(reminderDue(s, real, 14 * DAY)).toBe('rating')
    s = answerReminder(markShown(s, 'rating', 14 * DAY), 'rating', 'later', 14 * DAY)
    expect(reminderDue(s, real, 43 * DAY)).toBeNull()
    expect(reminderDue(s, real, 44 * DAY)).toBe('rating')
    s = answerReminder(markShown(s, 'rating', 44 * DAY), 'rating', 'later', 44 * DAY)
    expect(s.rating.asks).toBe(REMINDER_RULES.maxAsks)
    expect(reminderDue(s, real, 2000 * DAY)).toBeNull()
  })

  it('never comes back after rating or "Don\'t ask again"', () => {
    const shown = markShown(freshReminders(), 'rating', 0)
    expect(reminderDue(answerReminder(shown, 'rating', 'done', 0), real, 400 * DAY)).not.toBe('rating')
    expect(reminderDue(answerReminder(shown, 'rating', 'never', 0), real, 400 * DAY)).not.toBe('rating')
  })
})

describe('support reminder', () => {
  it('only a month after the rating card first appeared, and after more use', () => {
    let s = markShown(freshReminders(), 'rating', DAY)
    s = answerReminder(s, 'rating', 'done', DAY)
    expect(reminderDue(s, heavy, 30 * DAY)).toBeNull()
    expect(reminderDue(s, real, 32 * DAY)).toBeNull()
    expect(reminderDue(s, heavy, 31 * DAY)).toBe('support')
  })

  it('is not shown before the rating card ever was', () => {
    expect(reminderDue(answerReminder(freshReminders(), 'rating', 'never', 0), heavy, 400 * DAY)).toBeNull()
  })

  it('has its own answers: supporting ends it for good', () => {
    let s = answerReminder(markShown(freshReminders(), 'rating', DAY), 'rating', 'done', DAY)
    s = answerReminder(markShown(s, 'support', 31 * DAY), 'support', 'done', 31 * DAY)
    expect(reminderDue(s, heavy, 900 * DAY)).toBeNull()
  })
})

describe('stored state', () => {
  it('turns anything unexpected into a fresh, harmless state', () => {
    expect(sanitizeReminders(null)).toEqual(freshReminders())
    expect(sanitizeReminders({ rating: { status: 'maybe', asks: -3, nextAt: 'soon' } }).rating).toEqual(freshReminders().rating)
    const kept = sanitizeReminders({ rating: { status: 'never', asks: 2, nextAt: 5, firstAskedAt: 1 } })
    expect(kept.rating).toEqual({ status: 'never', asks: 2, nextAt: 5, firstAskedAt: 1 })
  })
})
