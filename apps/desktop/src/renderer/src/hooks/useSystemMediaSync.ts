import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import type { SystemMediaPayload } from '../../../types/media'

/**
 * Hook that listens to system-wide media updates (Apple Music, Spotify, etc.)
 * forwarded by the Electron main process via Windows SMTC (System Media Transport Controls).
 *
 * When external music is detected:
 * - Updates the current track metadata (Title, Artist, Album, Artwork)
 * - Synchronizes the turntable playback state (Playing vs Paused)
 * - Updates the timeline progress so the tonearm tracks the real groove position
 */
export function useSystemMediaSync(): void {
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgress = usePlayerStore((s) => s.setProgress)

  const commandCooldownRef = useRef(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.onSystemMediaUpdate) {
      return
    }

    window.__kissaMediaCommandCooldown = () => {
      commandCooldownRef.current = true
      setTimeout(() => { commandCooldownRef.current = false }, 1500)
    }

    const handleMediaPayload = (payload: SystemMediaPayload | null): void => {
      if (!payload || !payload.title) return

      const currentStoreTrack = usePlayerStore.getState().currentTrack

      // Determine if track changed or needs metadata refresh
      const isSameTrack =
        currentStoreTrack?.title === payload.title &&
        currentStoreTrack?.artist === payload.artist &&
        currentStoreTrack?.sourceAppId === payload.sourceAppId

      if (!isSameTrack) {
        setTrack({
          title: payload.title,
          artist: payload.artist || 'Unknown Artist',
          album: payload.album || payload.title,
          artworkUrl: payload.artworkDataUrl || albumPlaceholder,
          duration: payload.duration > 0 ? payload.duration : 0,
          source: payload.sourceAppName,
          sourceAppId: payload.sourceAppId
        })
      } else if (payload.artworkDataUrl && currentStoreTrack?.artworkUrl !== payload.artworkDataUrl) {
        // Update artwork if thumbnail arrived later
        usePlayerStore.setState((state) => ({
          currentTrack: state.currentTrack
            ? { ...state.currentTrack, artworkUrl: payload.artworkDataUrl }
            : null
        }))
      }

      // Sync playing state (drives vinyl spin animation)
      if (!commandCooldownRef.current && usePlayerStore.getState().isPlaying !== payload.isPlaying) {
        setIsPlaying(payload.isPlaying)
      }

      // Sync timeline progress (drives tonearm angle and scrub position)
      if (payload.progress >= 0) {
        const curProgress = usePlayerStore.getState().progress
        if (Math.abs(curProgress - payload.progress) >= 1) {
          setProgress(payload.progress)
        }
      }
    }

    // Initial check
    window.electron.getSystemMedia().then((initial) => {
      if (initial) {
        handleMediaPayload(initial)
      }
    })

    // Listen for live changes
    const cleanup = window.electron.onSystemMediaUpdate(handleMediaPayload)

    return (): void => {
      cleanup()
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [setTrack, setIsPlaying, setProgress])
}
