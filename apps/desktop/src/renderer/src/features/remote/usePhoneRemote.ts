import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { parseLrc } from '@renderer/features/lyrics/lrc'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import type { RemoteCommand, RemoteNowPlaying } from '../../../../types/remote'
import { useRemoteStore } from './remoteStore'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { playQueueIndex, queueSnapshot, subscribeQueue } from './queueSnapshot'
import { applyLook, lookSnapshot, subscribeLook } from './lookSnapshot'

/** Refreshes the phone's clock now and then, so it never drifts far from the record. */
const RESYNC_MS = 5000
const ART = /^data:image\/(jpeg|png|webp|gif);base64,/
const WEB_ART = /^https:\/\/[^\s]{1,1000}$/

/** The room's accent as #rrggbb (the canvas normalises any CSS colour); undefined if unknown. */
export function accentHex(): string | undefined {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (!value) return undefined
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return undefined
    ctx.fillStyle = '#000000'
    ctx.fillStyle = value
    return /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle : undefined
  } catch {
    return undefined
  }
}

/** Runs a phone's command exactly as the dock's own buttons do. */
export function runRemoteCommand(command: RemoteCommand): void {
  if (command.action === 'playIndex') {
    playQueueIndex(command.index, command.revision)
    return
  }
  if (command.action === 'look') {
    applyLook(command)
    return
  }
  const store = usePlayerStore.getState()
  const external = !!store.currentTrack?.sourceAppId
  const api = window.electron
  if (command.action === 'playPause') {
    store.togglePlayPause()
    if (external && api?.mediaPlayPause) {
      window.__kissaMediaCommandCooldown?.()
      void api.mediaPlayPause()
    }
  } else if (command.action === 'next') {
    if (external && api?.mediaNext) void api.mediaNext()
    else store.playNext()
  } else if (command.action === 'prev') {
    if (external && api?.mediaPrev) void api.mediaPrev()
    else store.playPrev()
  }
}

/** Where the record is, to the fraction of a second (the store keeps whole seconds). */
function playhead(): number {
  try {
    const t = PlaybackClock.getCurrentTime()
    if (Number.isFinite(t) && t >= 0) return t
  } catch {
    // fall through to the store's whole seconds
  }
  return usePlayerStore.getState().progress
}

export function nowPlayingSnapshot(): RemoteNowPlaying | null {
  const { currentTrack: track, isPlaying } = usePlayerStore.getState()
  if (!track) return null
  const progress = playhead()
  return {
    title: track.title ?? '',
    artist: track.artist ?? '',
    album: track.album ?? '',
    isPlaying,
    progress: Number.isFinite(progress) ? Math.max(0, progress) : 0,
    duration: Number.isFinite(track.duration) ? Math.max(0, track.duration) : 0,
    accent: accentHex(),
    artworkDataUrl: track.artworkUrl && ART.test(track.artworkUrl) ? track.artworkUrl : undefined,
    artworkRemoteUrl:
      track.artworkUrl && WEB_ART.test(track.artworkUrl) ? track.artworkUrl : undefined
  }
}

/**
 * The window's half of the phone remote: takes the phone's commands, and while a phone is
 * connected, tells it what is playing (the track, play or pause, a seek, the lines being sung).
 * With no phone there it sends nothing.
 */
export function usePhoneRemote(): void {
  const phones = useRemoteStore((s) => s.status.phones)

  useEffect(() => {
    const api = window.electron
    if (!api?.getPhoneRemote || !api.onPhoneRemoteChanged) return
    void api.getPhoneRemote().then((s) => useRemoteStore.getState().setStatus(s))
    const offStatus = api.onPhoneRemoteChanged((s) => useRemoteStore.getState().setStatus(s))
    const offCommand = api.onRemoteCommand?.(runRemoteCommand)
    return () => {
      offStatus()
      offCommand?.()
    }
  }, [])

  useEffect(() => {
    const api = window.electron
    if (!phones || !api?.sendRemoteNowPlaying) return
    let lastKey = ''
    let lastPlaying: boolean | null = null
    let lastArt: string | undefined
    let sentAt = 0
    let sentProgress = 0
    let lyricsFor = ''

    const send = (): void => {
      const snap = nowPlayingSnapshot()
      if (!snap) return
      api.sendRemoteNowPlaying?.(snap)
      lastPlaying = snap.isPlaying
      lastArt = snap.artworkDataUrl ?? snap.artworkRemoteUrl
      sentAt = performance.now()
      sentProgress = snap.progress
    }

    const sendLyrics = (snap: RemoteNowPlaying): void => {
      const key = `${snap.title}\u0000${snap.artist}`
      if (key === lyricsFor || !api.getLyrics || !api.sendRemoteLyrics) return
      lyricsFor = key
      const track = { title: snap.title, artist: snap.artist }
      void api
        .getLyrics({
          title: snap.title,
          artist: snap.artist,
          album: snap.album,
          duration: snap.duration
        })
        .then((res) => {
          if (lyricsFor !== key) return
          const offset = usePlayerStore.getState().lyricsOffset || 0
          const lines = res?.syncedLyrics
            ? parseLrc(res.syncedLyrics, offset).map((l) => ({ time: l.time, text: l.text }))
            : []
          api.sendRemoteLyrics?.(track, lines)
        })
        .catch(() => undefined)
    }

    const check = (): void => {
      const s = usePlayerStore.getState()
      const t = s.currentTrack
      const key = t ? `${t.title}\u0000${t.artist}\u0000${t.album}` : ''
      const expected = sentProgress + (lastPlaying ? (performance.now() - sentAt) / 1000 : 0)
      const jumped = Math.abs(playhead() - expected) > 2
      const art =
        t?.artworkUrl && (ART.test(t.artworkUrl) || WEB_ART.test(t.artworkUrl))
          ? t.artworkUrl
          : undefined
      if (key !== lastKey || s.isPlaying !== lastPlaying || art !== lastArt || jumped) {
        const trackChanged = key !== lastKey
        lastKey = key
        send()
        const snap = trackChanged ? nowPlayingSnapshot() : null
        if (snap) sendLyrics(snap)
      }
    }

    lastKey = '\u0001'
    check()
    const sendQueue = (): void => api.sendRemoteQueue?.(queueSnapshot())
    sendQueue()
    const offQueue = subscribeQueue(sendQueue)
    // The room's look: sent only when it really changes (the stores also change for playback).
    let lookSent = ''
    const sendLook = (): void => {
      const look = lookSnapshot()
      // sleepLeft counts down on its own; compare the timer's end instead.
      const json = JSON.stringify({ ...look, sleepLeft: useSleepStore.getState().endsAt })
      if (json === lookSent) return
      lookSent = json
      api.sendRemoteLook?.(look)
    }
    sendLook()
    const offLook = subscribeLook(sendLook)
    const unsubscribe = usePlayerStore.subscribe(check)
    const resync = window.setInterval(send, RESYNC_MS)
    return () => {
      unsubscribe()
      offQueue()
      offLook()
      window.clearInterval(resync)
    }
  }, [phones > 0]) // eslint-disable-line react-hooks/exhaustive-deps
}
