import { useEffect } from 'react'
import { useStudyStore } from '@renderer/stores/studyStore'

/**
 * Runs for the whole app (every view, mini player and tray), never inside a single view:
 * advances the session clock once a second and gives one gentle cue when a focus block
 * or a break ends. It never starts or stops the music.
 */
export function useStudyEngine(): void {
  const hasSession = useStudyStore((s) => s.active !== null)
  const keepAwake = useStudyStore(
    (s) => s.prefs.keepScreenAwake && s.active !== null && s.active.segment.runningSince !== null && !s.active.interruption
  )

  // While a session runs, keep the display on so the screensaver does not cover it.
  useEffect(() => {
    void window.electron?.setStudyKeepAwake?.(keepAwake)
  }, [keepAwake])
  useEffect(() => () => void window.electron?.setStudyKeepAwake?.(false), [])

  useEffect(() => {
    if (!hasSession) return
    const tick = (): void => {
      useStudyStore.getState().tick()
      announceIfEnded()
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return (): void => window.clearInterval(id)
  }, [hasSession])
}

function announceIfEnded(): void {
  const { active, prefs, markAnnounced } = useStudyStore.getState()
  if (!active || !active.segment.ended || active.interruption) return
  if (active.announcedSegmentId === active.segment.id) return
  markAnnounced(active.segment.id)

  const focusEnded = active.segment.kind === 'focus'
  if (prefs.chime) playChime(focusEnded)

  const body = focusEnded
    ? active.plan.breakMinutes > 0
      ? 'Focus block done. Take a break when you are ready.'
      : 'Focus block done.'
    : 'Break is over. Back to it when you are ready.'
  if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus()) && 'Notification' in window) {
    try {
      new Notification('Kissa Study Room', { body, silent: true })
    } catch {
      // Notifications unavailable: the room itself shows the state.
    }
  }
}

let audioContext: AudioContext | null = null

/** Two soft sine notes, like a small desk bell. Falling for a finished focus block, rising after a break. */
function playChime(falling: boolean): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioContext = audioContext ?? new Ctx()
    const ctx = audioContext
    const notes = falling ? [880, 659.25] : [659.25, 880]
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.28
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 1.5)
    })
  } catch {
    // No audio device: silent is fine.
  }
}
