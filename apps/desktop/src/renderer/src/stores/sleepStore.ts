import { create } from 'zustand'
import { usePlayerStore } from './playerStore'

/**
 * The sleep timer lives here, not in its button, so it keeps running when the dock is not on
 * screen (mini player, listening display) and so closing time can start it.
 */
interface SleepState {
  /** When the music stops (ms since epoch), or null when no timer runs. */
  endsAt: number | null
  /** Why the timer runs: the listener set it, or closing time did. */
  reason: 'manual' | 'closing' | null
  start: (minutes: number, reason?: 'manual' | 'closing') => void
  cancel: () => void
}

export const useSleepStore = create<SleepState>((set) => ({
  endsAt: null,
  reason: null,
  start: (minutes, reason = 'manual') =>
    set({ endsAt: Date.now() + Math.max(1, minutes) * 60_000, reason }),
  cancel: () => set({ endsAt: null, reason: null })
}))

/** Called once a second by useSleepClock: stops the music when the time is up. */
export function tickSleep(now: number = Date.now()): boolean {
  const { endsAt, cancel } = useSleepStore.getState()
  if (endsAt === null || now < endsAt) return false
  cancel()
  const player = usePlayerStore.getState()
  const wasPlaying = player.isPlaying
  player.pause()
  player.setIsPowered(false)
  if (wasPlaying && player.currentTrack?.sourceAppId && player.currentTrack.sourceAppId !== 'kissa-idle') {
    void window.electron?.mediaPlayPause?.()
  }
  return true
}
