import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'

/**
 * Custom hook to manage real audio playback via HTML5 Audio API.
 * Synchronizes playback state (play/pause), track seeking, time updates,
 * and master volume with the Zustand player store.
 *
 * Design: We use a single persistent Audio element stored in a ref.
 * Store subscriptions read state directly via getState() to avoid
 * putting rapidly-changing values (progress) into effect dependency arrays,
 * which would cause constant re-fires and interrupt playback.
 */
export function useAudioPlayback(): void {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTrackUrlRef = useRef<string | null>(null)
  /** True while the audio's own timeupdate is pushing progress to the store */
  const isSyncingTimeRef = useRef(false)
  /** True while we're programmatically seeking the audio element */
  const isSeekingRef = useRef(false)

  // ── 1. Create & tear down the Audio element once ──────────────────
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    // Push the audio's current time into the store (~4×/s via timeupdate)
    const onTimeUpdate = (): void => {
      if (isSeekingRef.current) return
      const currentSec = Math.floor(audio.currentTime)
      const storeProg = usePlayerStore.getState().progress
      if (currentSec !== storeProg) {
        isSyncingTimeRef.current = true
        usePlayerStore.getState().setProgress(currentSec)
        isSyncingTimeRef.current = false
      }
    }

    const onEnded = (): void => {
      usePlayerStore.getState().pause()
      usePlayerStore.getState().setProgress(0)
      audio.currentTime = 0
    }

    const onError = (): void => {
      console.warn('[useAudioPlayback] Audio element error — source may be unavailable')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    // Intentionally empty — this effect must run exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Load a new source when the track URL changes ───────────────
  const audioUrl = usePlayerStore((s) => s.currentTrack?.audioUrl)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audioUrl && audioUrl !== lastTrackUrlRef.current) {
      lastTrackUrlRef.current = audioUrl
      audio.src = audioUrl
      audio.load()

      // Seek to wherever the store's progress currently is
      const storeProg = usePlayerStore.getState().progress
      audio.currentTime = storeProg

      // Set volume
      const vol = usePlayerStore.getState().volume
      audio.volume = Math.max(0, Math.min(1, vol / 100))

      // Auto-play if the store says we should be playing
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => {
          // Autoplay may be blocked until a user gesture
        })
      }
    } else if (!audioUrl && lastTrackUrlRef.current) {
      lastTrackUrlRef.current = null
      audio.pause()
      audio.src = ''
    }
  }, [audioUrl])

  // ── 3. React to play / pause state changes ────────────────────────
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audio.src) return

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay policy may block — user will click again
      })
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // ── 4. React to external seek (scrubber click, tonearm drag) ──────
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      const progress = state.progress
      if (progress === prevState.progress) return

      // Skip if WE just pushed this value from timeupdate
      if (isSyncingTimeRef.current) return

      const audio = audioRef.current
      if (!audio || !audio.src) return

      // Only seek if the audio position actually differs meaningfully
      if (Math.abs(audio.currentTime - progress) > 1.5) {
        isSeekingRef.current = true
        audio.currentTime = progress
        // Small delay so the next timeupdate doesn't fight the seek
        setTimeout(() => {
          isSeekingRef.current = false
        }, 150)
      }
    })

    return () => unsubscribe()
  }, [])

  // ── 5. React to volume changes ────────────────────────────────────
  const volume = usePlayerStore((s) => s.volume)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.max(0, Math.min(1, volume / 100))
  }, [volume])

  // ── 6. Fallback timer for tracks WITHOUT an audioUrl ──────────────
  //    (keeps the UI timer ticking for mock/test tracks)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const currentAudioUrl = currentTrack?.audioUrl
  const duration = currentTrack?.duration

  useEffect(() => {
    if (!isPlaying || !currentTrack || currentAudioUrl) return
    const interval = setInterval(() => {
      usePlayerStore.getState().setProgress((prev) => {
        const dur = duration ?? 0
        if (dur > 0 && prev >= dur) return 0
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, audioUrl, duration])
}
