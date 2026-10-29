import type { MessageKey } from '@renderer/i18n'
import type { AlbumSidesResult } from '@renderer/env'

export type Sides = AlbumSidesResult

/** Where a track sits on the record. */
export interface SidePlace {
  side: number
  track: number
}

/** A title reduced for matching: no "feat.", no bracketed versions, no punctuation or case. */
export function normTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(
      /\s*[([](feat\.?|ft\.?|with|featuring|remaster|remastered|explicit|clean|bonus|live|mono|stereo|single|album|version|edit|radio)[^)\]]*[)\]]/g,
      ''
    )
    .replace(
      /\s+-\s+(feat\.?|ft\.?|remaster|remastered|live|mono|stereo|single|radio|edit|version).*$/g,
      ''
    )
    .replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function locate(sides: Sides | null, title: string): SidePlace | null {
  if (!sides || !title) return null
  const want = normTitle(title)
  if (!want) return null
  let loose: SidePlace | null = null
  for (let s = 0; s < sides.sides.length; s++) {
    const tracks = sides.sides[s].tracks
    for (let t = 0; t < tracks.length; t++) {
      const have = normTitle(tracks[t].title)
      if (have === want) return { side: s, track: t }
      if (
        !loose &&
        have.length >= 4 &&
        want.length >= 4 &&
        (have.startsWith(want) || want.startsWith(have))
      )
        loose = { side: s, track: t }
    }
  }
  return loose
}

/** Whether the album playing is a single: named so by the service, or named after the track. */
export function isSingle(album: string, title: string): boolean {
  if (!album || !title) return false
  if (/(\s[-\u2013\u2014]\s*single|\(single\)|\[single\])\s*$/i.test(album)) return true
  const a = normTitle(album)
  return a.length > 0 && a === normTitle(title)
}

/**
 * The sides of a single when the catalogue has nothing for it: the track alone on side A.
 * Null for anything that is not plainly a single, so an album never gets made-up sides.
 */
export function singleSides(album: string, title: string, durationSeconds: number): Sides | null {
  if (!isSingle(album, title)) return null
  return {
    kind: 'single',
    sides: [
      {
        letter: 'A',
        tracks: [{ title, length: durationSeconds > 0 ? Math.round(durationSeconds * 1000) : 0 }]
      }
    ]
  }
}

/**
 * How far through its side the needle is, 0 to 1: the tracks before this one plus the time
 * into this one, over the side's length. Null when the lengths are unknown.
 */
export function sideRatio(
  sides: Sides | null,
  place: SidePlace | null,
  seconds: number,
  trackSeconds: number
): number | null {
  if (!sides || !place) return null
  const tracks = sides.sides[place.side]?.tracks
  if (!tracks || !tracks.every((t) => t.length > 0)) return null
  const total = tracks.reduce((a, t) => a + t.length, 0)
  const before = tracks.slice(0, place.track).reduce((a, t) => a + t.length, 0)
  const own = tracks[place.track].length
  // The player's own length for this track may differ a little from the release's.
  const into =
    trackSeconds > 0
      ? (Math.max(0, Math.min(seconds, trackSeconds)) / trackSeconds) * own
      : Math.min(seconds * 1000, own)
  return Math.max(0, Math.min(1, (before + into) / total))
}

/**
 * Where the sides came from, said plainly: a vinyl release's own sides (which may not be the
 * edition playing), or Kissa's own arrangement of a track list that has no sides.
 */
export function sideSourceKeys(kind: Sides['kind']): { label: MessageKey; note: MessageKey } {
  return kind === 'vinyl'
    ? { label: 'sides.release', note: 'sides.releaseNote' }
    : { label: 'sides.arranged', note: 'sides.arrangedNote' }
}
