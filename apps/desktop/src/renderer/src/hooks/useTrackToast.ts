import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useFeaturesStore } from '../stores/featuresStore'
import { translate, useLanguageStore } from '../i18n'

/** `rgb(1, 2, 3)` or `#abc123` to `#abc123`; anything else to undefined. */
export function toHexColour(value: string): string | undefined {
  const v = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v
  const m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (!m) return undefined
  return '#' + m.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')
}

/** How long to wait for the new track's cover before showing the card anyway. */
const COVER_WAIT_MS = 900
/** A cover that arrives this long after the card appears still updates it in place. */
const LATE_COVER_MS = 5000

function coverFor(url: string | undefined): string | undefined {
  if (typeof url !== 'string') return undefined
  return url.startsWith('data:image/') || url.startsWith('https://') ? url : undefined
}

/**
 * When the song changes and Kissa is hidden or minimised, the main process shows a small card
 * in the corner (it checks the window itself, so this only says what changed). The card waits a
 * moment for the new cover, and takes it in place if it comes a little later.
 */
export function useTrackToast(): void {
  useEffect(() => {
    let lastKey = ''
    let timer = 0
    let shownKey = ''
    let shownAt = 0
    let shownArt: string | undefined
    const send = (): void => {
      const state = usePlayerStore.getState()
      const track = state.currentTrack
      if (!track || !useFeaturesStore.getState().trackToast || state.isScreensaver) return
      const accent =
        typeof document !== 'undefined'
          ? toHexColour(getComputedStyle(document.documentElement).getPropertyValue('--adaptive-accent') || '')
          : undefined
      shownKey = `${track.title}\u0000${track.artist}`
      shownAt = Date.now()
      shownArt = coverFor(track.artworkUrl)
      void window.electron?.showTrackToast?.({
        title: track.title,
        artist: track.artist ?? '',
        artwork: shownArt,
        accent,
        playing: state.isPlaying,
        label: translate(useLanguageStore.getState().language, 'toast.nowPlaying')
      })
    }
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const track = state.currentTrack
      if (!track || track.sourceAppId === 'kissa-idle' || !track.title) return
      const key = `${track.title}\u0000${track.artist}`
      if (key !== lastKey) {
        const first = lastKey === ''
        lastKey = key
        window.clearTimeout(timer)
        if (first && !state.isPlaying) return
        timer = window.setTimeout(send, COVER_WAIT_MS)
        return
      }
      // The cover came after the card: update it in place.
      if (key === shownKey && Date.now() - shownAt < LATE_COVER_MS && coverFor(track.artworkUrl) && coverFor(track.artworkUrl) !== shownArt) {
        send()
      }
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [])
}
