import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import type { SystemMediaPayload } from '../../../types/media'

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

      if (isInternalAudio && !payload.isPlaying) return

      const trackKey = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
      const isSameTrack = lastTrackKeyRef.current === trackKey

      if (!isSameTrack) {
        lastTrackKeyRef.current = trackKey
        anchorProgressRef.current = payload.progress || 0
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
        setIsPlaying(payload.isPlaying)
        setProgress(payload.progress || 0)
      } else {
        // Same track - check for metadata and thumbnail updates
        if (
          (payload.artworkDataUrl && currentStoreTrack?.artworkUrl !== payload.artworkDataUrl) ||
          (payload.artist && payload.artist !== currentStoreTrack?.artist) ||
          (payload.album && payload.album !== currentStoreTrack?.album)
        ) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack
              ? {
                ...state.currentTrack,
                artist: payload.artist || state.currentTrack.artist,
                album: payload.album || state.currentTrack.album,
                artworkUrl: payload.artworkDataUrl || state.currentTrack.artworkUrl
              }
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

        // Sync playback state (Playing vs Paused)
        const currentIsPlaying = usePlayerStore.getState().isPlaying
        if (!commandCooldownRef.current && currentIsPlaying !== payload.isPlaying) {
          const elapsed = (Date.now() - anchorTimestampRef.current) / 1000
          anchorProgressRef.current = currentIsPlaying
            ? anchorProgressRef.current + elapsed
            : anchorProgressRef.current
          anchorTimestampRef.current = Date.now()
          setIsPlaying(payload.isPlaying)
        }

        // Sync timeline progress with monotonic filter
        const curProgress = usePlayerStore.getState().progress
        const elapsedSinceAnchor = usePlayerStore.getState().isPlaying
          ? (Date.now() - anchorTimestampRef.current) / 1000
          : 0
        const localEstimate = anchorProgressRef.current + elapsedSinceAnchor
        const diff = payload.progress - localEstimate

        // If difference is large (> 2.0s) or a distinct seek/loop restart, accept SMTC position immediately
        if (Math.abs(diff) > 2.0 || payload.progress === 0) {
          anchorProgressRef.current = payload.progress
          anchorTimestampRef.current = Date.now()
          setProgress(Math.floor(payload.progress))
        } else if (payload.progress > curProgress) {
          anchorProgressRef.current = payload.progress
          anchorTimestampRef.current = Date.now()
          setProgress(Math.floor(payload.progress))
        } else {
          anchorProgressRef.current = Math.max(anchorProgressRef.current, payload.progress)
        }
      }

      // Sync master volume from Windows if present
      if (payload.volume !== undefined && typeof payload.volume === 'number') {
        const curVol = usePlayerStore.getState().volume
        if (Math.abs(curVol - payload.volume) > 1 && !(window as any).__kissaIsDraggingVolume) {
          usePlayerStore.getState().setVolume(payload.volume)
        }
      }
    }

    // Initial check for media & system volume
    window.electron.getSystemMedia().then((initial) => {
      if (initial) {
        handleMediaPayload(initial)
      }
    })

    window.electron.getVolume?.().then((vol) => {
      if (vol && typeof vol.master === 'number') {
        usePlayerStore.getState().setVolume(vol.master)
      }
    })

    // Listen for SMTC updates
    const cleanup = window.electron.onSystemMediaUpdate(handleMediaPayload)

    // Dedicated high-resolution monotonic timer for smooth external playback & zero-lag lyrics
    const ticker = setInterval(() => {
      const state = usePlayerStore.getState()
      if (!state.isPlaying || !state.currentTrack || state.currentTrack.audioUrl) return

      const elapsed = (Date.now() - anchorTimestampRef.current) / 1000
      const currentEstimated = anchorProgressRef.current + elapsed
      const dur = state.currentTrack.duration || 0
      const clamped = dur > 0 ? Math.min(dur, currentEstimated) : currentEstimated
      const rounded = Math.round(clamped * 10) / 10

      if (Math.abs(rounded - state.progress) >= 0.1) {
        setProgress(rounded)
      }
    }, 100)

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
