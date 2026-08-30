import { beforeEach, describe, expect, it, vi } from 'vitest'

const ONBOARDING_COMPLETION_KEY = 'kissa_intro_seen_v3'

async function loadPlayerStore() {
  vi.resetModules()
  return (await import('../playerStore')).usePlayerStore
}

describe('onboarding storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the v3 guide even when a legacy onboarding key exists', async () => {
    localStorage.setItem('kissa_intro_seen', 'true')
    localStorage.setItem('kissa_onboarding_completed', 'true')

    const usePlayerStore = await loadPlayerStore()

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(true)
  })

  it('keeps the v3 guide closed after completion', async () => {
    localStorage.setItem(ONBOARDING_COMPLETION_KEY, 'true')

    const usePlayerStore = await loadPlayerStore()

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('persists completion without changing legacy storage', async () => {
    localStorage.setItem('kissa_intro_seen', 'true')
    const usePlayerStore = await loadPlayerStore()

    usePlayerStore.getState().setIsOnboardingOpen(false)

    expect(localStorage.getItem(ONBOARDING_COMPLETION_KEY)).toBe('true')
    expect(localStorage.getItem('kissa_intro_seen')).toBe('true')
  })
})
