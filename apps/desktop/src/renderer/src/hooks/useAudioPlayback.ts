import { openJumpPlace } from './useJumpList'
import { useEffect, useRef } from 'react'
import { needleFollowPlayback } from '@renderer/utils/needleSounds'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { isAlbumUrl, useAlbumStore } from '@renderer/features/album/albumStore'
import { vinylEngine } from '@renderer/features/hifi/vinylEngine'

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

  // Create & tear down the Audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    PlaybackClock.setAudioElement(audio)
    // Albums from the PC can play through Kissa Hi-Fi's vinyl sound.
    vinylEngine.attach(audio)

    let animId: number | null = null

    // Coarse update loop for the text timer (1Hz)
    // The Scrubber will read directly from PlaybackClock at 60Hz.
    const syncTimeLoop = (): void => {
      if (!audio || isSeekingRef.current) return
      if (!audio.paused && !audio.ended) {
        const curTime = audio.currentTime
        const rounded = Math.round(curTime)
        const storeProg = usePlayerStore.getState().progress
        if (Math.abs(rounded - storeProg) >= 1) {
          isSyncingTimeRef.current = true
          usePlayerStore.getState().setProgress(rounded)
          isSyncingTimeRef.current = false
          
          if (typeof window !== 'undefined' && (window as any).electron) {
            const duration = audio.duration && audio.duration > 0 ? audio.duration : 1
            ;(window as any).electron.setProgress(curTime / duration, 'normal')
          }
        }
      }
      animId = requestAnimationFrame(syncTimeLoop)
    }

    const onPlay = (): void => {
      PlaybackClock.setMode(false) // Use internal audio
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
        usePlayerStore.getState().setProgress(Math.round(audio.currentTime))
        if (typeof window !== 'undefined' && (window as any).electron) {
          const duration = audio.duration && audio.duration > 0 ? audio.duration : 1
          ;(window as any).electron.setProgress(audio.currentTime / duration, 'paused')
        }
      }
    }

    const onEnded = (): void => {
      if (animId !== null) {
        cancelAnimationFrame(animId)
        animId = null
      }
      if (typeof window !== 'undefined' && (window as any).electron) {
        ;(window as any).electron.setProgress(-1, 'none')
      }
      usePlayerStore.getState().playNext()
    }

    const onError = (): void => {
      const url = usePlayerStore.getState().currentTrack?.audioUrl
      // A track from an album folder that will not play is skipped, and main says why.
      // (Clearing the source also raises an error; only the album file's own counts.)
      if (isAlbumUrl(url) && audio.src === url) {
        void useAlbumStore.getState().trackFailed(url)
        return
      }
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
      vinylEngine.detach()
      audio.pause()
      audio.src = ''
      audioRef.current = null
      PlaybackClock.setAudioElement(null)
    }
    // Intentionally empty — this effect must run exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load a new source when the track URL changes
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const audioUrl = currentTrack?.audioUrl
  const isPlayingStore = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audioUrl) {
      if (!isPlayingStore && !lastTrackUrlRef.current) {
        // Prevent Chromium from hijacking Windows SMTC on boot by deferring audio.src assignment
        // until the user actually requests playback for the first time.
        return
      }
      
      if (audioUrl !== lastTrackUrlRef.current) {
        lastTrackUrlRef.current = audioUrl
      audio.src = audioUrl
      audio.load()
      PlaybackClock.setMode(false)

      if ('mediaSession' in navigator && currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artwork: currentTrack.artworkUrl ? [{ src: currentTrack.artworkUrl, sizes: '512x512', type: 'image/png' }] : []
        })
        
        navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().play())
        navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause())
        navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().playPrev())
        navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().playNext())
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            PlaybackClock.setSeekPosition(details.seekTime)
          }
        })
      }

      const storeProg = usePlayerStore.getState().progress
      audio.currentTime = storeProg

      const vol = usePlayerStore.getState().volume
      audio.volume = Math.max(0, Math.min(1, vol / 100))

      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => {
        })
      }
      }
    } else if (!audioUrl && lastTrackUrlRef.current) {
      lastTrackUrlRef.current = null
      audio.pause()
      audio.src = ''
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
      }
      
      if (typeof window !== 'undefined' && (window as any).electron) {
        ;(window as any).electron.setProgress(-1, 'none')
      }
    }
  }, [audioUrl, currentTrack])

  // React to play / pause state changes
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    // The needle is heard when the visible tonearm lands or lifts (TonearmAssembly). With no arm
    // on screen, playback changes stand in for it (utils/needleSounds).

    if (isPlaying) {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      if (typeof window !== 'undefined' && (window as any).electron) (window as any).electron.setThumbarButtons(true)
      if (audio.src) {
        audio.play().catch(() => {
        })
      }
      needleFollowPlayback(true)
    } else {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
      if (typeof window !== 'undefined' && (window as any).electron) (window as any).electron.setThumbarButtons(false)
      if (audio.src) {
        audio.pause()
      }
      needleFollowPlayback(false)
    }
  }, [isPlaying])

  // React to external seek (scrubber click, tonearm drag)
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      const progress = state.progress
      if (progress === prevState.progress) return

      if (isSyncingTimeRef.current) return

      const audio = audioRef.current
      if (!audio || !audio.src) return

      // Only seek if the new progress differs from our rounded native time to prevent duplicate identical seeks
      if (Math.round(audio.currentTime) !== progress) {
        isSeekingRef.current = true
        PlaybackClock.setSeekPosition(progress) // Use unified PlaybackClock method
        
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current)
        }
        
        seekTimeoutRef.current = setTimeout(() => {
          isSeekingRef.current = false
        }, 150)
      }
    })

    return () => {
      unsubscribe()
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current)
      }
    }
  }, [])

  // React to volume changes
  const volume = usePlayerStore((s) => s.volume)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.max(0, Math.min(1, volume / 100))
  }, [volume])

  // Listen to Tray IPC
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron && (window as any).electron.onTrayAction) {
      const cleanup = (window as any).electron.onTrayAction((action: string) => {
        const store = usePlayerStore.getState()
        const isExternal = !!store.currentTrack?.sourceAppId

        switch (action) {
          case 'togglePlayPause':
            store.isPlaying ? store.pause() : store.play()
            if (isExternal && (window as any).electron.mediaPlayPause) {
              ;(window as any).__kissaMediaCommandCooldown?.()
              ;(window as any).electron.mediaPlayPause()
            }
            break
          case 'playPrev':
            if (isExternal && (window as any).electron.mediaPrev) {
              ;(window as any).electron.mediaPrev()
            } else {
              store.playPrev()
            }
            break
          case 'playNext':
            if (isExternal && (window as any).electron.mediaNext) {
              ;(window as any).electron.mediaNext()
            } else {
              store.playNext()
            }
            break
          case 'toggleMiniPlayer':
            store.toggleMiniPlayer()
            break
          case 'checkForUpdates':
            store.setIsSettingsOpen(true)
            break
          default:
            if (action.startsWith('open:')) openJumpPlace(action.slice(5))
        }
      })
      return cleanup
    }
    return undefined
  }, [])
}
