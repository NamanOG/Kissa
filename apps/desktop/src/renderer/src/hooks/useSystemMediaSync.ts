import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import type { SystemMediaPayload } from '../../../types/media'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'

export function useSystemMediaSync(): void {
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgress = usePlayerStore((s) => s.setProgress)

  const commandCooldownRef = useRef(false)
  const lastTrackKeyRef = useRef('')
  const prevTrackDurationRef = useRef(-1)

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
      const currentStoreIsPlaying = usePlayerStore.getState().isPlaying
      const isInternalAudio = Boolean(currentStoreTrack?.audioUrl)

      // Only ignore a paused external payload if Kissa is currently actively playing internal audio
      if (isInternalAudio && currentStoreIsPlaying && !payload.isPlaying) return

      PlaybackClock.setMode(true) // External media mode

      const trackKey = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
      const isSameTrack = lastTrackKeyRef.current === trackKey

      if (!isSameTrack) {
        prevTrackDurationRef.current = currentStoreTrack?.duration || -1
        lastTrackKeyRef.current = trackKey
        PlaybackClock.setSmtcState(payload.progress || 0, payload.isPlaying)

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

        // Defensively update duration if it changes for the current track
        if (payload.duration > 0 && payload.duration !== currentStoreTrack?.duration) {
          // If the new duration exactly matches the PREVIOUS track's duration, 
          // and we already have a valid (>0) duration for the CURRENT track,
          // it is highly likely a delayed stale metadata broadcast. Ignore it.
          const isLateStaleUpdate = 
            payload.duration === prevTrackDurationRef.current && 
            (currentStoreTrack?.duration || 0) > 0

          if (!isLateStaleUpdate) {
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
          setIsPlaying(payload.isPlaying)
        }

        // Sync timeline progress with monotonic filter via PlaybackClock
        const localEstimate = PlaybackClock.getCurrentTime()
        const diff = payload.progress - localEstimate

        // If difference is large (> 1.5s) or a distinct seek/loop restart, accept SMTC position immediately
        if (Math.abs(diff) > 1.5 || payload.progress === 0) {
          PlaybackClock.setSmtcState(payload.progress, payload.isPlaying)
          setProgress(payload.progress)
        } else if (payload.progress > localEstimate + 0.1) { // Slight buffer
          PlaybackClock.setSmtcState(payload.progress, payload.isPlaying)
        } else {
          // If local estimate is ahead, let SMTC just catch up or update playing state only
          PlaybackClock.setSmtcState(Math.max(localEstimate, payload.progress), payload.isPlaying)
        }
      }

    }

    // Initial check for media & system volume
    window.electron.getSystemMedia().then((initial) => {
      if (initial) {
        handleMediaPayload(initial)
      }
    })

    // Listen for SMTC updates
    const cleanup = window.electron.onSystemMediaUpdate(handleMediaPayload)

    // Coarse timer for text UI updates (e.g. 1Hz)
    const ticker = setInterval(() => {
      const state = usePlayerStore.getState()
      if (!state.isPlaying || !state.currentTrack || state.currentTrack.audioUrl) return

      const currentTime = PlaybackClock.getCurrentTime()
      const dur = state.currentTrack.duration || 0
      const clamped = dur > 0 ? Math.min(dur, currentTime) : currentTime
      const rounded = Math.round(clamped)

      if (Math.abs(rounded - state.progress) >= 1) {
        setProgress(rounded)
      }
    }, 1000)

    // Listen for manual seeks from React UI
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentTrack?.audioUrl) return
      if (Math.abs(state.progress - prevState.progress) > 1.5) {
        PlaybackClock.setSeekPosition(state.progress)
      }
    })

    return (): void => {
      cleanup()
      clearInterval(ticker)
      unsubscribe()
    }
  }, [setTrack, setIsPlaying, setProgress])
}

