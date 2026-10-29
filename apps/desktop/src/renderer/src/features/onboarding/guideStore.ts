import { create } from 'zustand'
import { usePlayerStore } from '@renderer/stores/playerStore'

/** Bumped when the guide gains pages someone who already read it should see. */
export const NEW_GUIDE_KEY = 'kissa_guide_new_v1'
const PROMPTED_KEY = 'kissa_guide_new_prompted_v1'

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function write(key: string): void {
  try {
    localStorage.setItem(key, 'true')
  } catch {
    // Not saved; asks again next time.
  }
}

interface GuideState {
  /** 'new' shows only the pages added since the guide was last read. */
  mode: 'all' | 'new'
  /** True until the new pages have been seen, in either mode. */
  hasNew: boolean
  openNew: () => void
  /** The guide closed: whatever was shown, the new pages count as seen. */
  closed: () => void
  /** For the one-time card: true the first time, then false. */
  takePrompt: () => boolean
}

export const useGuideStore = create<GuideState>((set) => ({
  mode: 'all',
  hasNew: !read(NEW_GUIDE_KEY),
  openNew: () => {
    set({ mode: 'new' })
    usePlayerStore.getState().setIsOnboardingOpen(true)
  },
  closed: () => {
    write(NEW_GUIDE_KEY)
    set({ mode: 'all', hasNew: false })
  },
  takePrompt: () => {
    if (read(PROMPTED_KEY) || read(NEW_GUIDE_KEY)) return false
    write(PROMPTED_KEY)
    return true
  }
}))
