/**
 * Small, rare prompts that help Kissa grow without getting in the way:
 * a "What's new" note once after each update, and a polite request for a Store rating
 * after someone has used Kissa for a while. Everything is kept on this PC.
 */

export const GROWTH_KEY = 'kissa_growth_v1'
const DAY = 24 * 60 * 60 * 1000

export interface GrowthState {
  /** When this record was first created (first launch with this feature). */
  installedAt: number
  /** Launches counted since then. */
  launches: number
  /** The version whose "What's new" was last seen (or skipped on a fresh install). */
  lastSeenVersion: string | null
  rating: 'pending' | 'done' | 'never'
  /** Times the rating prompt has been shown. */
  ratingAsked: number
  /** Not before this time. */
  ratingNextAt: number
}

export function freshGrowth(now: number): GrowthState {
  return { installedAt: now, launches: 0, lastSeenVersion: null, rating: 'pending', ratingAsked: 0, ratingNextAt: now + 4 * DAY }
}

export function loadGrowth(now: number): GrowthState {
  try {
    const raw = localStorage.getItem(GROWTH_KEY)
    if (!raw) return freshGrowth(now)
    const parsed = JSON.parse(raw) as Partial<GrowthState>
    return { ...freshGrowth(now), ...parsed }
  } catch {
    return freshGrowth(now)
  }
}

export function saveGrowth(state: GrowthState): void {
  try {
    localStorage.setItem(GROWTH_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable: the prompts simply may show again.
  }
}

function parts(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0)
}

export function isNewer(a: string, b: string): boolean {
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  }
  return false
}

/**
 * "What's new" shows once per new version for people who already used Kissa. A fresh
 * install sees the guide instead, so its first version counts as seen.
 */
export function whatsNewDecision(state: GrowthState, version: string, firstRun: boolean): { show: boolean; next: GrowthState } {
  if (!version) return { show: false, next: state }
  if (state.lastSeenVersion === version) return { show: false, next: state }
  if (firstRun) return { show: false, next: { ...state, lastSeenVersion: version } }
  const show = state.lastSeenVersion === null || isNewer(version, state.lastSeenVersion)
  return { show, next: { ...state, lastSeenVersion: version } }
}

/** Asked at most twice: after four days and five launches, and once more a month after "Later". */
export function shouldAskForRating(state: GrowthState, now: number): boolean {
  return (
    state.rating === 'pending' &&
    state.ratingAsked < 2 &&
    state.launches >= 5 &&
    now - state.installedAt >= 4 * DAY &&
    now >= state.ratingNextAt
  )
}

export function afterRatingAnswer(state: GrowthState, answer: 'rate' | 'later' | 'never', now: number): GrowthState {
  if (answer === 'rate') return { ...state, rating: 'done', ratingAsked: state.ratingAsked + 1 }
  if (answer === 'never') return { ...state, rating: 'never', ratingAsked: state.ratingAsked + 1 }
  return { ...state, ratingAsked: state.ratingAsked + 1, ratingNextAt: now + 30 * DAY }
}
