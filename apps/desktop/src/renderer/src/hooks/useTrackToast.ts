import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useFeaturesStore } from '../stores/featuresStore'
import { translate, useLanguageStore } from '../i18n'
import { extractColorsFromImage } from './useAdaptiveColor'

const hex = (n: number): string => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

/** `rgb(1, 2, 3)`, `hsl(30, 50%, 40%)` (the room's palettes) or `#abc123` to `#abc123`; anything else to undefined. */
export function toHexColour(value: string): string | undefined {
  const v = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v
  const hsl = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i)
  if (hsl) {
    const h = (Number(hsl[1]) % 360) / 360
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const ch = (t: number): number => {
      const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t
      if (x < 1 / 6) return p + (q - p) * 6 * x
      if (x < 1 / 2) return q
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
      return p
    }
    return '#' + [ch(h + 1 / 3), ch(h), ch(h - 1 / 3)].map((c) => hex(c * 255)).join('')
  }
  const m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (!m) return undefined
  return '#' + m.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')
}

/** How long to wait for the new track's cover before showing the card anyway. */
const COVER_WAIT_MS = 900
/** A cover that arrives this long after the card appears still updates it in place. */
const LATE_COVER_MS = 5000

/**
 * The card's accent: the new song's own palette (cached by the room, so usually instant), not the
 * room's colour variable, which changes a beat after the song (RECOLOUR_DELAY_MS). Only in the
 * album-matched room, as before; a palette that takes longer than `waitMs` leaves it out.
 */
export async function toastAccent(
  artworkUrl: string | undefined,
  theme: string,
  extract: (url: string) => Promise<{ accent: string }> = extractColorsFromImage,
  waitMs = 400
): Promise<string | undefined> {
  if (theme !== 'adaptive' || !artworkUrl || artworkUrl.includes('placeholder-album')) return undefined
  try {
    const palette = await Promise.race([
      extract(artworkUrl),
      new Promise<null>((r) => setTimeout(() => r(null), waitMs))
    ])
    return palette ? toHexColour(palette.accent) : undefined
  } catch {
    return undefined
  }
}

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
    const send = async (): Promise<void> => {
      const state = usePlayerStore.getState()
      const track = state.currentTrack
      if (!track || !useFeaturesStore.getState().trackToast || state.isScreensaver) return
      const accent = await toastAccent(track.artworkUrl, state.theme)
      // The song changed again while the palette was read: that song's card follows.
      if (usePlayerStore.getState().currentTrack !== track) return
      shownKey = `${track.title}\u0000${track.artist}`
      shownAt = Date.now()
      shownArt = coverFor(track.artworkUrl)
      void window.electron?.showTrackToast?.({
        title: track.title,
        artist: track.artist ?? '',
        artwork: shownArt,
        accent,
        playing: state.isPlaying,
        label: translate(useLanguageStore.getState().language, 'toast.nowPlaying'),
        playPauseLabel: translate(useLanguageStore.getState().language, 'toast.playPause'),
        nextLabel: translate(useLanguageStore.getState().language, 'toast.next')
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
        timer = window.setTimeout(() => void send(), COVER_WAIT_MS)
        return
      }
      // The cover came after the card: update it in place.
      if (key === shownKey && Date.now() - shownAt < LATE_COVER_MS && coverFor(track.artworkUrl) && coverFor(track.artworkUrl) !== shownArt) {
        void send()
      }
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [])
}
