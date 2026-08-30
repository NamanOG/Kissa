import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'

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
    PlaybackClock.setAudioElement(audio)

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
      PlaybackClock.setAudioElement(null)
    }
    // Intentionally empty — this effect must run exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Load a new source when the track URL changes ───────────────
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

  // ── 3. React to play / pause state changes ────────────────────────
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const physicalFeedback = usePlayerStore.getState().physicalFeedback
    
    // Play synthetic physical feedback thud
    const playNeedleSound = (isDrop: boolean) => {
      if (!physicalFeedback || typeof window === 'undefined') return
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return
        const ctx = new AudioContextClass()
        const now = ctx.currentTime

        // Base mechanical transient (wide-band noise burst)
        const bufferSize = Math.floor(ctx.sampleRate * 0.05) // 50ms buffer
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2)) // rapid decay
        }
        
        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        
        const noiseFilter = ctx.createBiquadFilter()
        const noiseGain = ctx.createGain()
        
        noise.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        if (isDrop) {
          // Drop: dull, heavy transient
          noiseFilter.type = 'lowpass'
          noiseFilter.frequency.setValueAtTime(800, now)
          
          noiseGain.gain.setValueAtTime(0.04, now)
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

          // Sub-bass resonance (plinth vibration)
          const sub = ctx.createOscillator()
          const subGain = ctx.createGain()
          sub.type = 'sine'
          sub.frequency.setValueAtTime(45, now)
          sub.frequency.exponentialRampToValueAtTime(30, now + 0.15)
          
          sub.connect(subGain)
          subGain.connect(ctx.destination)
          
          subGain.gain.setValueAtTime(0.08, now)
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
          
          sub.start(now)
          sub.stop(now + 0.2)
        } else {
          // Lift: sharp, light mechanical click
          noiseFilter.type = 'highpass'
          noiseFilter.frequency.setValueAtTime(3000, now)
          
          noiseGain.gain.setValueAtTime(0.02, now)
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)
        }
        
        noise.start(now)
        noise.stop(now + 0.05)
        
        // Ensure context is closed after sound finishes to prevent memory leak
        setTimeout(() => {
          ctx.close().catch(() => {})
        }, 300)
      } catch (e) {
        // Ignore audio context errors
      }
    }

    if (isPlaying) {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      if (typeof window !== 'undefined' && (window as any).electron) (window as any).electron.setThumbarButtons(true)
      if (audio.src) {
        audio.play().catch(() => {
          // Autoplay policy may block
        })
      }
      playNeedleSound(true)
    } else {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
      if (typeof window !== 'undefined' && (window as any).electron) (window as any).electron.setThumbarButtons(false)
      if (audio.src) {
        audio.pause()
      }
      playNeedleSound(false)
    }
  }, [isPlaying])

  // ── 4. React to external seek (scrubber click, tonearm drag) ──────
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      const progress = state.progress
      if (progress === prevState.progress) return

      // Skip if WE just pushed this value from timeupdate
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

  // ── 5. React to volume changes ────────────────────────────────────
  const volume = usePlayerStore((s) => s.volume)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.max(0, Math.min(1, volume / 100))
  }, [volume])

  // ── 6. Listen to Tray IPC ─────────────────────────────────────────
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
            // Open settings modal so user can see/click the update check
            store.setIsSettingsOpen(true)
            break
        }
      })
      return cleanup
    }
    return undefined
  }, [])
}
