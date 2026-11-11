import { describe, expect, it } from 'vitest'
import { freshGrowth, isNewer, whatsNewDecision } from '../growth'

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
  it('does not repeat the last notes for a maintenance update', () => {
    const s = freshGrowth(0)
    expect(whatsNewDecision({ ...s, lastSeenVersion: '4.3.0' }, '4.3.1', false)).toEqual({
      show: false,
      next: { ...s, lastSeenVersion: '4.3.1' }
    })
    // Someone arriving from 4.2 has not seen the 4.3 notes yet.
    expect(whatsNewDecision({ ...s, lastSeenVersion: '4.2.0' }, '4.3.1', false).show).toBe(true)
  })
  it('compares versions numerically', () => {
    expect(isNewer('4.10.0', '4.9.9')).toBe(true)
    expect(isNewer('4.3.0', '4.3.0')).toBe(false)
  })
})
