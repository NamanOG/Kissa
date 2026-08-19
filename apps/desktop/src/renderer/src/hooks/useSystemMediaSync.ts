import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import type { SystemMediaPayload } from '../../../types/media'

/**
 * Hook that listens to system-wide media updates (Apple Music, Spotify, etc.)
 * forwarded by the Electron main process via Windows SMTC.
 *
 * Implements jitter-free monotonic timekeeping, seamless track transitions,
 * and automatic duration synchronization.
 */
export function useSystemMediaSync(): void {
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgress = usePlayerStore((s) => s.setProgress)

  const commandCooldownRef = useRef(false)
  const anchorProgressRef = useRef(0)
  const anchorTimestampRef = useRef(Date.now())
  const hasSeenNonZeroSmtcRef = useRef(false)
  const lastTrackKeyRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.onSystemMediaUpdate) {
      return
    }

    window.__kissaMediaCommandCooldown = () => {
      commandCooldownRef.current = true
      setTimeout(() => {
        commandCooldownRef.current = false
      }, 1500)
    }

    const handleMediaPayload = (payload: SystemMediaPayload | null): void => {
      if (!payload || !payload.title) return

      const currentStoreTrack = usePlayerStore.getState().currentTrack
      const isInternalAudio = Boolean(currentStoreTrack?.audioUrl)
      if (isInternalAudio) return

      const trackKey = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
      const isSameTrack = lastTrackKeyRef.current === trackKey

      if (!isSameTrack) {
        lastTrackKeyRef.current = trackKey
        hasSeenNonZeroSmtcRef.current = payload.progress > 0
        anchorProgressRef.current = payload.progress
        anchorTimestampRef.current = Date.now()

        setTrack({
          title: payload.title,
          artist: payload.artist || 'Unknown Artist',
          album: payload.album || payload.title,
          artworkUrl: payload.artworkDataUrl || albumPlaceholder,
          duration: payload.duration > 0 ? payload.duration : 0,
          source: payload.sourceAppName,
          sourceAppId: payload.sourceAppId
        })
      } else {
        // Same track - check for thumbnail updates
        if (payload.artworkDataUrl && currentStoreTrack?.artworkUrl !== payload.artworkDataUrl) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack
              ? { ...state.currentTrack, artworkUrl: payload.artworkDataUrl }
              : null
          }))
        }

        // Update duration if SMTC just learned it
        if (payload.duration > 0 && (!currentStoreTrack?.duration || currentStoreTrack.duration === 0)) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack
              ? { ...state.currentTrack, duration: payload.duration }
              : null
          }))
        }
      }

      // Sync playback state (Playing vs Paused)
      const currentIsPlaying = usePlayerStore.getState().isPlaying
      if (!commandCooldownRef.current && currentIsPlaying !== payload.isPlaying) {
        // Re-anchor when playback state changes
        const elapsed = (Date.now() - anchorTimestampRef.current) / 1000
        anchorProgressRef.current = currentIsPlaying
          ? anchorProgressRef.current + elapsed
          : anchorProgressRef.current
        anchorTimestampRef.current = Date.now()
        setIsPlaying(payload.isPlaying)
      }

      // Sync timeline progress with monotonic filter (prevents 13, 14, 15, 15, 16 stutter)
      if (payload.progress > 0) {
        hasSeenNonZeroSmtcRef.current = true
        const curProgress = usePlayerStore.getState().progress
        const elapsedSinceAnchor = usePlayerStore.getState().isPlaying
          ? (Date.now() - anchorTimestampRef.current) / 1000
          : 0
        const localEstimate = anchorProgressRef.current + elapsedSinceAnchor
        const diff = payload.progress - localEstimate

        // If difference is large (> 2.5s) or a distinct seek, accept SMTC position immediately
        if (Math.abs(diff) > 2.5) {
          anchorProgressRef.current = payload.progress
          anchorTimestampRef.current = Date.now()
          setProgress(Math.floor(payload.progress))
        } else if (payload.progress > curProgress) {
          // If SMTC is ahead of store, update anchor
          anchorProgressRef.current = payload.progress
          anchorTimestampRef.current = Date.now()
          setProgress(Math.floor(payload.progress))
        } else {
          // Minor delayed timestamp from SMTC polling — calibrate anchor gently without stepping back
          anchorProgressRef.current = Math.max(anchorProgressRef.current, payload.progress)
        }
      }
    }

    // Initial check
    window.electron.getSystemMedia().then((initial) => {
      if (initial) {
        handleMediaPayload(initial)
      }
    })

    // Listen for SMTC updates
    const cleanup = window.electron.onSystemMediaUpdate(handleMediaPayload)

    // Dedicated high-resolution monotonic timer for smooth external playback
    const ticker = setInterval(() => {
      const state = usePlayerStore.getState()
      if (!state.isPlaying || !state.currentTrack || state.currentTrack.audioUrl) return

      const elapsed = (Date.now() - anchorTimestampRef.current) / 1000
      const currentEstimated = anchorProgressRef.current + elapsed
      const dur = state.currentTrack.duration || 0
      const clamped = dur > 0 ? Math.min(dur, currentEstimated) : currentEstimated
      const curFloor = Math.floor(clamped)

      if (curFloor > state.progress) {
        setProgress(curFloor)
      }
    }, 400)

    // Listen for manual seeks (e.g. user dragged scrubber / tonearm)
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentTrack?.audioUrl) return
      if (Math.abs(state.progress - prevState.progress) > 1.5) {
        anchorProgressRef.current = state.progress
        anchorTimestampRef.current = Date.now()
      }
    })

    return (): void => {
      cleanup()
      clearInterval(ticker)
      unsubscribe()
    }
  }, [setTrack, setIsPlaying, setProgress])
}
