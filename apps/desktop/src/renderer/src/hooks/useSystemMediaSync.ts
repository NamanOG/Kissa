import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'
import type { SystemMediaPayload } from '../../../types/media'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
const isKissaSMTCSession = (payload: SystemMediaPayload, currentStoreTrack: any): boolean => {
  if (!payload.sourceAppId) {
    // Fallback if OS provides no identity: conservatively assume it's Kissa's echo
    // if the title and artist perfectly match our internal track.
    return payload.title === currentStoreTrack?.title && payload.artist === currentStoreTrack?.artist
  }
  
  const lowerId = payload.sourceAppId.toLowerCase()
  
  // Production AUMID or executable
  if (lowerId.includes('com.namanog.kissa') || lowerId.includes('kissa')) {
    return true
  }
  
  // Development Electron executable
  if (lowerId.includes('electron')) {
    // In dev, multiple Electron apps might run. We use title as an additional sanity check.
    return payload.title === currentStoreTrack?.title
  }
  
  return false
}

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
      const currentStoreTrack = usePlayerStore.getState().currentTrack
      const currentStoreIsPlaying = usePlayerStore.getState().isPlaying
      const isInternalAudio = Boolean(currentStoreTrack?.audioUrl)

      if (!payload || !payload.title) {
        if (isInternalAudio) return // Leave internal audio alone

        // If no internal audio and SMTC cleared, set idle state
        setTrack({
          title: 'Kissa',
          artist: 'Listening Room',
          album: 'Kissa',
          artworkUrl: kissaIdleCover,
          duration: 0,
          source: 'Kissa',
          sourceAppId: 'kissa-idle'
        })
        setIsPlaying(false)
        setProgress(0)
        PlaybackClock.setMode(true)
        lastTrackKeyRef.current = 'Kissa|Listening Room|kissa-idle'
        return
      }

      // Identify if the incoming payload is just an echo of Kissa's own internal playback.
      const isOurEcho = isInternalAudio && isKissaSMTCSession(payload, currentStoreTrack)

      if (isOurEcho) {
        // Kissa is the active session. Ignore the echo to prevent hijacking.
        return
      }

      // If we reach here, the payload is from a genuine external media source (e.g. Spotify),
      // OR Kissa is completely idle (no internal track loaded).
      // We must accept it and yield the clock.
      if (isInternalAudio) {
        // We had an internal track loaded, but an external app just took over.
        // We must pause our internal audio so the external app can play cleanly.
        usePlayerStore.getState().pause()
      }

      PlaybackClock.setMode(true) // External media mode

      const trackKey = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
      
      // Defensively verify the store wasn't externally reset (e.g., via Vite HMR or state hydration)
      const storeMatchesPayload = currentStoreTrack?.title === payload.title && currentStoreTrack?.sourceAppId === payload.sourceAppId
      const isSameTrack = lastTrackKeyRef.current === trackKey && storeMatchesPayload

      if (!isSameTrack) {
        if (typeof window !== 'undefined') {
          delete (window as any).__kissaSeekCooldown
        }
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

        // Seek cooldown check to prevent rubberbanding during external SMTC command processing
        const seekCooldown = typeof window !== 'undefined' ? (window as any).__kissaSeekCooldown : null
        if (seekCooldown) {
          const elapsedSinceSeek = performance.now() - seekCooldown.timestamp
          const matchesTarget = Math.abs(payload.progress - seekCooldown.target) <= 2.0
          if (elapsedSinceSeek < 1200 && !matchesTarget) {
            // Pre-seek packet arriving: preserve optimistic PlaybackClock and local progress
            return
          } else {
            // Cooldown expired safely or external SMTC has reconciled with target
            delete (window as any).__kissaSeekCooldown
          }
        }

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
      handleMediaPayload(initial || null)
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
      // Use monotonic timestamp delta to ensure we don't duplicate seeks
      if (state.progress !== prevState.progress) {
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

