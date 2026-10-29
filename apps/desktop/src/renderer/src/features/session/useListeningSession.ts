import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { translate, useLanguageStore } from '@renderer/i18n'
import { SessionTracker, type SessionSummary } from './sessionTracker'

export function sessionNoticeText(summary: SessionSummary, name: string): { title: string; stats: [string, string][] } {
  const lang = useLanguageStore.getState().language
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>): string => translate(lang, key, vars)
  return {
    title: name ? tr('session.titleNamed', { name }) : tr('session.title'),
    stats: [
      [String(summary.minutes), tr('session.minutes')],
      [String(summary.albums), summary.albums === 1 ? tr('session.album') : tr('session.albums')],
      [String(summary.songs), summary.songs === 1 ? tr('session.song') : tr('session.songs')]
    ]
  }
}

/** Keeps the local play history and, when a long listen ends, shows a short summary. */
export function useListeningSession(): void {
  useEffect(() => {
    const tracker = new SessionTracker()
    const id = window.setInterval(() => {
      const s = usePlayerStore.getState()
      if (s.isScreensaver) return
      const t = s.currentTrack
      const real = t && t.sourceAppId !== 'kissa-idle' && t.title ? t : null
      const summary = tracker.tick(
        Date.now(),
        s.isPlaying && !!real,
        real ? { title: real.title, artist: real.artist ?? '', album: real.album ?? '', artwork: real.artworkUrl, room: s.theme } : null
      )
      if (!summary || !useFeaturesStore.getState().sessionWrap) return
      if (document.documentElement.hasAttribute('data-window-hidden')) return
      const text = sessionNoticeText(summary, s.listenerName)
      useNoticeStore.getState().show({ id: `session-${Date.now()}`, title: text.title, stats: text.stats, covers: summary.covers, duration: 9000 })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
}
