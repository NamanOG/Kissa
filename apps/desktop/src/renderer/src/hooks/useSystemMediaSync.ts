import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'
import type { SystemMediaPayload } from '../../../types/media'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { externalSession, resetExternalSession } from '@renderer/utils/externalSession'
import { useAlbumStore } from '@renderer/features/album/albumStore'
const isKissaSMTCSession = (payload: SystemMediaPayload, currentStoreTrack: any): boolean => {
  if (!payload.sourceAppId) {
    // Fallback if OS provides no identity: conservatively assume it's Kissa's echo
    // if the title and artist perfectly match our internal track.
    return (
      payload.title === currentStoreTrack?.title && payload.artist === currentStoreTrack?.artist
    )
  }

  const lowerId = payload.sourceAppId.toLowerCase()

  if (lowerId.includes('com.namanog.kissa') || lowerId.includes('kissa')) {
    return true
  }

  if (lowerId.includes('electron')) {
    // In dev, multiple Electron apps might run. We use title as an additional sanity check.
    // Chromium names Kissa's own session after the window ("Kissa") when the page gives it no
    // song details, so a track change in an album would otherwise look like another player.
    const windowTitle = typeof document !== 'undefined' ? document.title : ''
    return (
      payload.title === currentStoreTrack?.title || (!!windowTitle && payload.title === windowTitle)
    )
  }

  return false
}

/** Longest a new song waits for its cover before it is shown without one. */
export const COVER_WAIT_MS = 450

export function useSystemMediaSync(): void {
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgress = usePlayerStore((s) => s.setProgress)

  const commandCooldownRef = useRef(false)
  const lastTrackKeyRef = useRef('')
  const prevTrackDurationRef = useRef(-1)
  // A new song's title arrives a moment before its cover. It is held back (at most
  // COVER_WAIT_MS) so the title, cover, record and room change together, once.
  const pendingRef = useRef<{
    key: string
    payload: SystemMediaPayload
    receivedAt: number
    timer: ReturnType<typeof setTimeout>
  } | null>(null)
  const releaseKeyRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.onSystemMediaUpdate) {
      return
    }

    resetExternalSession()

    window.__kissaMediaCommandCooldown = () => {
      commandCooldownRef.current = true
      setTimeout(() => {
        commandCooldownRef.current = false
      }, 1500)
    }

    const dropPending = (): void => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
    }

    const handleMediaPayload = (payload: SystemMediaPayload | null): void => {
      const currentStoreTrack = usePlayerStore.getState().currentTrack
      const currentStoreIsPlaying = usePlayerStore.getState().isPlaying
      const isInternalAudio = Boolean(currentStoreTrack?.audioUrl)

      // Hold a new song from another player until its cover arrives, when a song from another
      // player is on screen now (from nothing, or from Kissa's own record, it shows at once).
      if (payload?.title) {
        const key = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
        const showingExternal =
          !isInternalAudio &&
          !!currentStoreTrack?.sourceAppId &&
          currentStoreTrack.sourceAppId !== 'kissa-idle'
        const isNewSong = key !== lastTrackKeyRef.current
        if (isNewSong && showingExternal && !payload.artworkDataUrl && releaseKeyRef.current !== key) {
          const pending = pendingRef.current
          if (pending && pending.key === key) {
            pending.payload = payload
          } else {
            dropPending()
            pendingRef.current = {
              key,
              payload,
              receivedAt: performance.now(),
              timer: setTimeout(() => {
                const held = pendingRef.current
                if (!held) return
                pendingRef.current = null
                releaseKeyRef.current = held.key
                const waited = (performance.now() - held.receivedAt) / 1000
                handleMediaPayload({
                  ...held.payload,
                  progress: (held.payload.progress || 0) + (held.payload.isPlaying ? waited : 0)
                })
              }, COVER_WAIT_MS)
            }
          }
          return
        }
        // Its cover came (show it now), or another new song replaced it. A late report from the
        // song still on screen leaves the held one waiting.
        const held = pendingRef.current
        if (held && (key === held.key || isNewSong)) dropPending()
      } else {
        dropPending()
      }

      if (!payload || !payload.title) {
        resetExternalSession()
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

      // From here on the payload is from another player (e.g. Spotify), or Kissa is idle.
      const trackKey = `${payload.title}|${payload.artist || ''}|${payload.sourceAppId || ''}`
      const wasPlayingThis = externalSession.key === trackKey && externalSession.playing
      externalSession.key = trackKey
      externalSession.playing = payload.isPlaying

      if (isInternalAudio) {
        // Kissa's own record stays on unless the listener starts music elsewhere: another player
        // takes over when it starts playing (or plays something new) while the album plays, or
        // plays at all while the album is paused. Its paused and "still playing" reports, which
        // Windows keeps sending, leave the album alone.
        const takesOver = payload.isPlaying && (!currentStoreIsPlaying || !wasPlayingThis)
        if (!takesOver) return
        // Keep the album's place for Resume album, then step aside.
        useAlbumStore.getState().suspend()
        usePlayerStore.getState().pause()
      }

      PlaybackClock.setMode(true) // External media mode

      // Defensively verify the store wasn't externally reset (e.g., via Vite HMR or state hydration)
      const storeMatchesPayload =
        currentStoreTrack?.title === payload.title &&
        currentStoreTrack?.sourceAppId === payload.sourceAppId
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
          sourceAppId: payload.sourceAppId,
          canSeek: payload.canSeek !== false
        })
        setIsPlaying(payload.isPlaying)
        setProgress(payload.progress || 0)
      } else {
        const isCurrentSameAsNew = currentStoreTrack?.artworkUrl === payload.artworkDataUrl
        // Main has already compared catalogue artwork with the player's picture.
        // A later player picture is authoritative too, including HTTP -> embedded repairs.
        const shouldUpdateArtwork = Boolean(payload.artworkDataUrl) && !isCurrentSameAsNew

        const shouldUpdateArtist =
          Boolean(payload.artist) && payload.artist !== currentStoreTrack?.artist
        const shouldUpdateAlbum =
          Boolean(payload.album) && payload.album !== currentStoreTrack?.album

        const canSeek = payload.canSeek !== false
        if (currentStoreTrack && (currentStoreTrack.canSeek !== false) !== canSeek) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack ? { ...state.currentTrack, canSeek } : null
          }))
        }

        if (shouldUpdateArtwork || shouldUpdateArtist || shouldUpdateAlbum) {
          usePlayerStore.setState((state) => ({
            currentTrack: state.currentTrack
              ? {
                  ...state.currentTrack,
                  artist: shouldUpdateArtist ? payload.artist! : state.currentTrack.artist,
                  album: shouldUpdateAlbum ? payload.album! : state.currentTrack.album,
                  artworkUrl: shouldUpdateArtwork
                    ? payload.artworkDataUrl!
                    : state.currentTrack.artworkUrl
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
        const seekCooldown =
          typeof window !== 'undefined' ? (window as any).__kissaSeekCooldown : null
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
        if (
          commandCooldownRef.current &&
          payload.isPlaying !== usePlayerStore.getState().isPlaying
        ) {
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
      dropPending()
      cleanup()
      clearInterval(ticker)
      unsubscribe()
    }
  }, [setTrack, setIsPlaying, setProgress])
}
