import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { locate, singleSides, type Sides } from './sides'
import { currentLetter, FLIP_MS, useSidesStore } from './sidesStore'

/** How long to wait before asking again after an empty answer. */
const RETRY_MS = [15_000, 45_000, 120_000]

/**
 * Keeps the record's sides for the album playing: asks for its track list once per album, finds
 * the track on it, and turns the record over when the music moves on to the next side.
 */
export function useAlbumSides(): void {
  const enabled = useFeaturesStore((s) => s.albumSides)
  const track = usePlayerStore((s) => s.currentTrack)
  const title = track?.title ?? ''
  const artist = track?.artist ?? ''
  const album = track?.album ?? ''
  const idle = !track || track.sourceAppId === 'kissa-idle'
  const flipTimer = useRef(0)
  const retryTimer = useRef(0)

  useEffect(() => {
    window.clearTimeout(retryTimer.current)
    if (!enabled || idle || !artist || !album) {
      useSidesStore.setState({
        albumKey: null,
        sides: null,
        place: null,
        flipping: false,
        shownLetter: null,
        lookup: enabled ? 'missing' : 'off'
      })
      return
    }
    const key = `${artist}|${album}`.toLowerCase()
    const state = useSidesStore.getState()
    const place = (sides: Sides | null): void => {
      const before = useSidesStore.getState()
      const next = locate(sides, title)
      const turned =
        before.albumKey === key && before.place && next && next.side !== before.place.side
      const flip = Boolean(turned && usePlayerStore.getState().isPlaying)
      // The label keeps the old letter until the deck turns the record over (TurntableEngine).
      useSidesStore.setState({
        albumKey: key,
        sides,
        place: next,
        ...(flip ? {} : { shownLetter: currentLetter({ sides, place: next }) })
      })
      if (flip) {
        window.clearTimeout(flipTimer.current)
        useSidesStore.setState((s) => ({ flipping: true, flipCount: s.flipCount + 1 }))
        flipTimer.current = window.setTimeout(() => {
          // Whatever happened to the animation, the label ends on the side playing.
          useSidesStore.setState((s) => ({ flipping: false, shownLetter: currentLetter(s) }))
        }, FLIP_MS)
      }
    }
    if (state.albumKey === key && state.sides && state.sides.kind !== 'single') {
      place(state.sides)
      return
    }
    if (state.albumKey !== key)
      useSidesStore.setState({
        albumKey: key,
        sides: null,
        place: null,
        shownLetter: null,
        lookup: 'finding'
      })
    const settle = (found: Sides | null): void => {
      // A later album won: drop this answer. Set without a flip: the first answer for an
      // album is not a turn of the record.
      if (useSidesStore.getState().albumKey !== key) return
      const now = usePlayerStore.getState().currentTrack
      const nowTitle = now?.title ?? title
      let sides = found
      let at = locate(sides, nowTitle)
      if (!at) {
        // Not in the catalogue (or not under this name): a single still has its side A.
        sides = singleSides(album, nowTitle, now?.duration ?? 0)
        at = locate(sides, nowTitle)
      }
      useSidesStore.setState({
        sides,
        place: at,
        shownLetter: currentLetter({ sides, place: at }),
        lookup: sides ? 'found' : 'missing'
      })
    }
    const ask = window.electron?.getAlbumSides
    if (!ask) {
      settle(null)
      return
    }
    // MusicBrainz is often busy for a moment, and then the answer is empty. A record found is
    // remembered by the main process and a real miss is too, so asking again costs nothing
    // there: keep asking a few times, further apart, while this album plays.
    const attempt = (n: number): void => {
      ask(artist, album)
        .then((sides) => sides ?? null)
        .catch(() => null)
        .then((sides) => {
          if (useSidesStore.getState().albumKey !== key) return
          settle(sides)
          if (!sides && n < RETRY_MS.length)
            retryTimer.current = window.setTimeout(() => attempt(n + 1), RETRY_MS[n])
        })
    }
    attempt(0)
  }, [enabled, idle, artist, album, title])

  useEffect(
    () => () => {
      window.clearTimeout(flipTimer.current)
      window.clearTimeout(retryTimer.current)
    },
    []
  )
}
