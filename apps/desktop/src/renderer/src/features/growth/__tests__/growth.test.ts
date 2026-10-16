import { describe, expect, it } from 'vitest'
import { afterRatingAnswer, freshGrowth, isNewer, shouldAskForRating, whatsNewDecision } from '../growth'

const DAY = 24 * 60 * 60 * 1000

describe("What's new", () => {
  it('shows once to people updating, never on a fresh install', () => {
    const s = freshGrowth(0)
    expect(whatsNewDecision(s, '4.3.0', true).show).toBe(false)
    const seen = whatsNewDecision(s, '4.3.0', true).next
    expect(whatsNewDecision(seen, '4.3.0', false).show).toBe(false)
    // An existing user updating from a version before this feature.
    expect(whatsNewDecision(s, '4.3.0', false).show).toBe(true)
    expect(whatsNewDecision({ ...s, lastSeenVersion: '4.3.0' }, '4.4.0', false).show).toBe(true)
    expect(whatsNewDecision({ ...s, lastSeenVersion: '4.4.0' }, '4.3.0', false).show).toBe(false)
  })
  it('compares versions numerically', () => {
    expect(isNewer('4.10.0', '4.9.9')).toBe(true)
    expect(isNewer('4.3.0', '4.3.0')).toBe(false)
  })
})

describe('rating prompt', () => {
  it('waits four days and five launches, and asks at most twice', () => {
    const s = { ...freshGrowth(0), launches: 5 }
    expect(shouldAskForRating(s, 3 * DAY)).toBe(false)
    expect(shouldAskForRating(s, 4 * DAY)).toBe(true)
    expect(shouldAskForRating({ ...s, launches: 4 }, 5 * DAY)).toBe(false)
    const later = afterRatingAnswer(s, 'later', 4 * DAY)
    expect(shouldAskForRating(later, 10 * DAY)).toBe(false)
    expect(shouldAskForRating(later, 35 * DAY)).toBe(true)
    const twice = afterRatingAnswer(later, 'later', 35 * DAY)
    expect(shouldAskForRating(twice, 400 * DAY)).toBe(false)
    expect(shouldAskForRating(afterRatingAnswer(s, 'never', 4 * DAY), 400 * DAY)).toBe(false)
    expect(shouldAskForRating(afterRatingAnswer(s, 'rate', 4 * DAY), 400 * DAY)).toBe(false)
  })
})
