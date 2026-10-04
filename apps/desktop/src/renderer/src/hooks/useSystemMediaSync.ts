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
  
  if (lowerId.includes('com.namanog.kissa') || lowerId.includes('kissa')) {
    return true
  }
  
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
        PlaybackClock.setSmtcState(0, false)
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
        const isCurrentPlaceholder = !currentStoreTrack?.artworkUrl || currentStoreTrack.artworkUrl === albumPlaceholder
        const isCurrentSameAsNew = currentStoreTrack?.artworkUrl === payload.artworkDataUrl
        const isUpgradingFromDataToHttp = Boolean(currentStoreTrack?.artworkUrl?.startsWith('data:') && payload.artworkDataUrl?.startsWith('http'))
        const shouldUpdateArtwork =
          Boolean(payload.artworkDataUrl) &&
          !isCurrentSameAsNew &&
          (isCurrentPlaceholder || isUpgradingFromDataToHttp || !currentStoreTrack?.artworkUrl?.startsWith('http'))

        const shouldUpdateArtist = Boolean(payload.artist) && payload.artist !== currentStoreTrack?.artist
        const shouldUpdateAlbum = Boolean(payload.album) && payload.album !== currentStoreTrack?.album

        if (shouldUpdateArtwork || shouldUpdateArtist || shouldUpdateAlbum) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack
              ? {
                ...state.currentTrack,
                artist: shouldUpdateArtist ? payload.artist! : state.currentTrack.artist,
                album: shouldUpdateAlbum ? payload.album! : state.currentTrack.album,
                artworkUrl: shouldUpdateArtwork ? payload.artworkDataUrl! : state.currentTrack.artworkUrl
              }
              : null
          }))
        }

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

        // Sync playback state (Playing vs Paused). The store is the single source of
        // truth for the clock's running state (see the store subscription below).
        const currentIsPlaying = usePlayerStore.getState().isPlaying
        if (!commandCooldownRef.current && currentIsPlaying !== payload.isPlaying) {
          setIsPlaying(payload.isPlaying)
        }
        PlaybackClock.setSmtcPlaying(usePlayerStore.getState().isPlaying)

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

        // While a play/pause sent from Kissa is still in flight, the source's reports
        // describe the old state; do not let them move the clock.
        if (commandCooldownRef.current && payload.isPlaying !== usePlayerStore.getState().isPlaying) {
          return
        }

        // Reconcile position: seeks and restarts jump, small drift is eased out.
        const sampleAgeMs = payload.lastUpdatedTime ? Date.now() - payload.lastUpdatedTime : 0
        if (PlaybackClock.syncSmtc(payload.progress, sampleAgeMs) === 'hard') {
          setProgress(payload.progress)
        }
      }

    }

    window.electron.getSystemMedia().then((initial) => {
      handleMediaPayload(initial || null)
    })

    const cleanup = window.electron.onSystemMediaUpdate(handleMediaPayload)

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

    // Keep the clock's running state in step with the store, so play/pause from any
    // control takes effect on the lyrics and scrubber at once.
    // `progress` is deliberately NOT mirrored into the clock: it is a whole-second
    // readout written by the ticker above, and feeding it back rounded the clock to
    // the nearest second (lyrics up to half a second out). Seeks go through `seek()`,
    // which moves the clock itself.
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentTrack?.audioUrl) return
      if (state.isPlaying !== prevState.isPlaying) {
        PlaybackClock.setSmtcPlaying(state.isPlaying)
      }
    })

    return (): void => {
      cleanup()
      clearInterval(ticker)
      unsubscribe()
    }
  }, [setTrack, setIsPlaying, setProgress])
}

