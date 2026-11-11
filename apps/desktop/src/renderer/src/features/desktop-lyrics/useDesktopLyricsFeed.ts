import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { useLanguageStore, translate } from '@renderer/i18n'
import { toHexColour } from '@renderer/hooks/useTrackToast'
import { parseLrc, type LyricLine } from '../lyrics/lrc'
import { useDesktopLyricsStore } from './desktopLyricsStore'
import { buildFrame, createFrameSender } from './desktopLyricsFeed'

/** Same settle time as the lyrics view: a source reports the old length for a moment. */
const LOOKUP_SETTLE_MS = 350

function readAccent(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const root = getComputedStyle(document.documentElement)
  return toHexColour(root.getPropertyValue('--adaptive-accent') || root.getPropertyValue('--accent') || '')
}

/**
 * Feeds the Desktop lyrics window. Mounted once in the app; does nothing while the feature is
 * off. It looks the lyrics up for the playing track by itself (the lyrics view may be closed),
 * follows the playback clock, and sends the window a frame only when the words change.
 */
export function useDesktopLyricsFeed(): void {
  const enabled = useDesktopLyricsStore((s) => s.status.enabled)
  const language = useLanguageStore((s) => s.language)

  // Status from the main process: at start and whenever the shortcut or the window changes it.
  useEffect(() => {
    const api = window.electron
    if (!api?.getDesktopLyrics) return
    void api.getDesktopLyrics().then((s) => useDesktopLyricsStore.getState().setStatus(s)).catch(() => undefined)
    return api.onDesktopLyricsChanged?.((s) => useDesktopLyricsStore.getState().setStatus(s))
  }, [])

  useEffect(() => {
    window.electron?.sendDesktopLyricsLabels?.({
      lock: translate(language, 'dlyrics.lock'),
      unlock: translate(language, 'dlyrics.unlock'),
      close: translate(language, 'dlyrics.close'),
      size: translate(language, 'dlyrics.size')
    })
  }, [language])

  useEffect(() => {
    const send = window.electron?.sendDesktopLyricsFrame
    if (!enabled || !send) return

    const sender = createFrameSender(send)
    let lines: LyricLine[] = []
    let source: string | null = null
    let offset = usePlayerStore.getState().lyricsOffset || 0
    let accent = readAccent()
    let trackKey = ''
    let duration = 0
    let lookupTimer = 0
    let accentTimer = 0
    let round = 0

    const push = (time = PlaybackClock.getCurrentTime()): void => {
      const s = usePlayerStore.getState()
      sender.push(
        buildFrame({
          lines,
          time,
          playing: s.isPlaying && Boolean(s.currentTrack),
          covered: s.isFullscreen || s.isPartyMode || s.isScreensaver,
          accent
        })
      )
    }

    const lookUp = (): void => {
      const s = usePlayerStore.getState()
      const t = s.currentTrack
      const mine = ++round
      if (!t || !t.title || t.sourceAppId === 'kissa-idle' || !window.electron?.getLyrics) {
        lines = []
        source = null
        push()
        return
      }
      window.clearTimeout(lookupTimer)
      lookupTimer = window.setTimeout(() => {
        void window.electron
          .getLyrics({ title: t.title, artist: t.artist ?? '', album: t.album ?? '', duration: Math.round(t.duration ?? 0) })
          .then((res) => {
            if (mine !== round) return
            source = res?.syncedLyrics ?? null
            lines = source ? parseLrc(source, offset) : []
            push()
          })
          .catch(() => {
            if (mine !== round) return
            lines = []
            push()
          })
      }, LOOKUP_SETTLE_MS)
    }

    const followTrack = (s: ReturnType<typeof usePlayerStore.getState>): void => {
      const t = s.currentTrack
      const key = t ? `${t.title}\u0000${t.artist}\u0000${t.album}` : ''
      const length = Math.round(t?.duration ?? 0)
      if (key !== trackKey) {
        trackKey = key
        duration = length
        lines = []
        source = null
        push()
        lookUp()
        // The room's colour follows the new cover a moment later.
        window.clearTimeout(accentTimer)
        accentTimer = window.setTimeout(() => {
          accent = readAccent()
          push()
        }, 1200)
      } else if (length !== duration) {
        duration = length
        if (!source) lookUp()
      }
    }

    followTrack(usePlayerStore.getState())
    const offStore = usePlayerStore.subscribe((s, prev) => {
      followTrack(s)
      if (s.lyricsOffset !== prev.lyricsOffset) {
        offset = s.lyricsOffset || 0
        lines = source ? parseLrc(source, offset) : []
      }
      if (s.theme !== prev.theme) accent = readAccent()
      if (
        s.isPlaying !== prev.isPlaying ||
        s.isFullscreen !== prev.isFullscreen ||
        s.isPartyMode !== prev.isPartyMode ||
        s.lyricsOffset !== prev.lyricsOffset ||
        s.theme !== prev.theme
      ) {
        push()
      }
    })
    const offClock = PlaybackClock.subscribe((time) => push(time))

    return () => {
      round++
      offStore()
      offClock()
      window.clearTimeout(lookupTimer)
      window.clearTimeout(accentTimer)
      send({ visible: false, current: '', next: '' })
    }
  }, [enabled])
}
