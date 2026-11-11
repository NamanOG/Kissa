import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useWindowVisible } from '@renderer/hooks/useWindowVisible'
import { useT } from '@renderer/i18n'

/** A song must stay this long before it is announced (skipping through songs says nothing). */
export const ANNOUNCE_AFTER_MS = 1200
/** Nothing is announced in the first moments after Kissa opens. */
export const QUIET_START_MS = 3000

/**
 * Tells screen readers (Narrator) when the song changes: "Now playing: {title} by {artist}", once
 * per song, after it has stayed a moment. Not on every progress tick, not when the same song
 * resumes, not while the window is hidden, and not at start-up.
 */
export function NowPlayingAnnouncer(): React.JSX.Element {
  const t = useT()
  const title = usePlayerStore((s) => s.currentTrack?.title?.trim() ?? '')
  const artist = usePlayerStore((s) => s.currentTrack?.artist?.trim() ?? '')
  const idle = usePlayerStore((s) => !s.currentTrack || s.currentTrack.sourceAppId === 'kissa-idle')
  const visible = useWindowVisible()
  const [text, setText] = useState('')
  const mountedAt = useRef(Date.now())
  const lastSaid = useRef('')

  useEffect(() => {
    const id = `${title}\u0000${artist}`
    if (idle || !title) {
      setText('')
      return
    }
    if (!visible || id === lastSaid.current) return
    const wait = Math.max(ANNOUNCE_AFTER_MS, QUIET_START_MS - (Date.now() - mountedAt.current))
    const timer = window.setTimeout(() => {
      // The first song at start-up is the one already showing: remember it, say nothing.
      if (Date.now() - mountedAt.current < QUIET_START_MS + ANNOUNCE_AFTER_MS && !lastSaid.current) {
        lastSaid.current = id
        return
      }
      lastSaid.current = id
      setText(t('a11y.nowPlayingSong', { title, artist: artist || '—' }))
    }, wait)
    return () => window.clearTimeout(timer)
  }, [title, artist, idle, visible, t])

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="now-playing-announcer">
      {text}
    </div>
  )
}
