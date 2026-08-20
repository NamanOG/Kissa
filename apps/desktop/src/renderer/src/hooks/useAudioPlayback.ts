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

    let animId: number | null = null

    // High-resolution smooth progress loop during local audio playback
    const syncTimeLoop = (): void => {
      if (!audio || isSeekingRef.current) return
      if (!audio.paused && !audio.ended) {
        const curTime = audio.currentTime
        const rounded = Math.round(curTime * 10) / 10
        const storeProg = usePlayerStore.getState().progress
        if (Math.abs(rounded - storeProg) >= 0.1) {
          isSyncingTimeRef.current = true
          usePlayerStore.getState().setProgress(rounded)
          isSyncingTimeRef.current = false
        }
      }
      animId = requestAnimationFrame(syncTimeLoop)
    }

    const onPlay = (): void => {
      if (animId === null) {
        animId = requestAnimationFrame(syncTimeLoop)
      }
    }

    const onPause = (): void => {
      if (animId !== null) {
        cancelAnimationFrame(animId)
        animId = null
      }
      if (audio) {
        usePlayerStore.getState().setProgress(Math.round(audio.currentTime * 10) / 10)
      }
    }

    const onEnded = (): void => {
      if (animId !== null) {
        cancelAnimationFrame(animId)
        animId = null
      }
      usePlayerStore.getState().pause()
      usePlayerStore.getState().setProgress(0)
      audio.currentTime = 0
    }

    const onError = (): void => {
      console.warn('[useAudioPlayback] Audio element error — source may be unavailable')
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      if (animId !== null) {
        cancelAnimationFrame(animId)
      }
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
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
}
