/**
 * Sides of a record: an album's track list split into side A, side B (and C, D for a double).
 *
 * A vinyl release on MusicBrainz numbers its tracks by side ("A1", "B3"), and that is used as
 * it is. Otherwise (a CD or digital release) the tracks are split by running time into two
 * sides, or four when the album is longer than one record holds.
 */
export interface SideTrack {
  title: string
  /** Milliseconds; 0 when unknown. */
  length: number
}

export interface RecordSide {
  letter: string
  tracks: SideTrack[]
}

export interface AlbumSides {
  /** 'vinyl': the sides of a real pressing. 'split': divided by Kissa. 'single': one track, side A. */
  kind: 'vinyl' | 'split' | 'single'
  sides: RecordSide[]
}

export interface SourceTrack {
  title: string
  length: number
  /** The release's own track number, e.g. "A1" on vinyl or "3" on a CD. */
  number?: string
}

/** About what one side of an LP holds comfortably. */
const ONE_RECORD_MS = 48 * 60_000
const LETTERS = 'ABCDEFGH'

export function sidesFromTracks(tracks: SourceTrack[]): AlbumSides | null {
  const usable = tracks.filter((t) => t.title)
  if (usable.length === 0) return null
  // A single: the A-side of a 7-inch.
  if (usable.length === 1) return { kind: 'single', sides: [{ letter: 'A', tracks: [{ title: usable[0].title, length: Math.max(0, usable[0].length || 0) }] }] }

  // A pressing's own sides.
  const lettered = usable.map((t) => /^\s*([A-Ha-h])\s*\d*\s*$/.exec(t.number ?? '')?.[1]?.toUpperCase())
  if (lettered.every(Boolean)) {
    const sides: RecordSide[] = []
    usable.forEach((t, i) => {
      const letter = lettered[i]!
      let side = sides.find((s) => s.letter === letter)
      if (!side) sides.push((side = { letter, tracks: [] }))
      side.tracks.push({ title: t.title, length: Math.max(0, t.length || 0) })
    })
    if (sides.length >= 2) return { kind: 'vinyl', sides: sides.sort((a, b) => a.letter.localeCompare(b.letter)) }
  }

  // Split by time: two sides, or four for a long album, each starting on a track boundary as
  // close as possible to an even share of the running time.
  const lengths = usable.map((t) => (t.length > 0 ? t.length : 0))
  const known = lengths.every((l) => l > 0)
  const weights = known ? lengths : usable.map(() => 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const count = Math.min(usable.length, known && total > ONE_RECORD_MS && usable.length >= 4 ? 4 : 2)
  const sides: RecordSide[] = Array.from({ length: count }, (_, i) => ({ letter: LETTERS[i], tracks: [] }))
  let before = 0
  let side = 0
  usable.forEach((t, i) => {
    // Move to the next side when this track's middle passes the next boundary, keeping at least
    // one track for each side still to come.
    const mid = before + weights[i] / 2
    const left = usable.length - i
    while (side < count - 1 && (mid > (total * (side + 1)) / count || left <= count - 1 - side) && sides[side].tracks.length > 0) side++
    sides[side].tracks.push({ title: t.title, length: lengths[i] })
    before += weights[i]
  })
  return { kind: 'split', sides }
}

/** Album names as streaming services dress them, reduced to the record's own name. */
export function plainAlbumName(album: string): string {
  return album
    .replace(/\s*[([](deluxe|bonus|remaster(ed)?|anniversary|expanded|special|edition|version|explicit|clean)[^)\]]*[)\]]/gi, '')
    .replace(/\s*-\s*(deluxe|bonus|remaster(ed)?|anniversary|expanded|special|edition|version|explicit).*$/gi, '')
    .replace(/\s*-\s*(single|ep)$/gi, '')
    .trim()
}
