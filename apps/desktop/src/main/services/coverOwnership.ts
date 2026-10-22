/**
 * Whether the player's cover belongs to the track it arrived with.
 *
 * Players can report a new title while still serving the previous track's picture. The
 * helper holds those back (ThumbnailOwnership.cs, the same rule), but this is the last line
 * before a picture is shown and, more importantly, remembered as the track's cover.
 *
 * A picture identical to the previous track's is suspect unless it is the same album, or
 * the same song with no album to say otherwise. Suspect pictures are hidden for the first
 * seconds of a track (the usual late swap), then shown but never remembered: different
 * releases can genuinely share one image file (standard and deluxe editions, a single and
 * its album), and refusing them outright would leave those tracks coverless offline.
 */
export interface CoverOwner {
  cover: string
  title: string
  artist: string
  album: string
}

/** own: show and remember. unproven: show, but do not remember. stale: neither, for now. */
export type CoverVerdict = 'own' | 'unproven' | 'stale'

/** Matches ThumbnailOwnership.SuspectWindowMs in the helper. */
export const SUSPECT_WINDOW_MS = 4000

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

export function judgeCover(previous: CoverOwner | undefined, next: CoverOwner, msSinceTrackChange: number): CoverVerdict {
  if (!previous || previous.cover !== next.cover) return 'own'
  const albumsKnown = previous.album.trim() !== '' && next.album.trim() !== ''
  if (albumsKnown && same(previous.album, next.album)) return 'own'
  const sameTrack = same(previous.title, next.title) && same(previous.artist, next.artist)
  if (sameTrack && !albumsKnown) return 'own'
  return msSinceTrackChange < SUSPECT_WINDOW_MS ? 'stale' : 'unproven'
}
