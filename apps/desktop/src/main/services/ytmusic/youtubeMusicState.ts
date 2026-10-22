/**
 * What the Kissa connector for YouTube Music reports, checked field by field.
 *
 * The connector runs only on https://music.youtube.com. Nothing else can produce this
 * state: ordinary YouTube, other sites and Windows' own browser media sessions never
 * become "YouTube Music" in Kissa.
 */
export interface YouTubeMusicState {
  title: string
  artist: string
  album: string
  /** A public https cover from YouTube Music's own image hosts, or undefined. */
  artworkUrl?: string
  isPlaying: boolean
  /** Seconds. */
  position: number
  duration: number
  /** When the connector read the player (epoch ms, Kissa's clock). */
  receivedAt: number
}

const MAX_TEXT = 200
// YouTube Music's own image hosts (seen live: yt3.googleusercontent.com for album covers).
const ARTWORK_HOSTS = /^https:\/\/(lh3\.googleusercontent\.com|yt3\.googleusercontent\.com|yt3\.ggpht\.com|i\.ytimg\.com|i9\.ytimg\.com)\//

const text = (v: unknown): string | null => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TEXT) : null)
const seconds = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 24 * 3600 ? v : null

/**
 * A well-formed playing/paused state, or null. Ads, empty titles and anything malformed
 * are refused: the connector skips ads itself, and this is the second check.
 */
export function parseYouTubeMusicState(body: unknown, now: number): YouTubeMusicState | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.v !== 1) return null
  if (b.ad === true) return null
  const title = text(b.title)
  const artist = text(b.artist)
  const album = text(b.album) ?? ''
  const position = seconds(b.position)
  const duration = seconds(b.duration)
  if (!title || !artist || position === null || duration === null) return null
  if (typeof b.playing !== 'boolean') return null
  const art = typeof b.artworkUrl === 'string' && b.artworkUrl.length <= 1000 && ARTWORK_HOSTS.test(b.artworkUrl) ? b.artworkUrl : undefined
  return {
    title,
    artist,
    album,
    artworkUrl: art,
    isPlaying: b.playing,
    position: duration > 0 ? Math.min(position, duration) : position,
    duration,
    receivedAt: now
  }
}

/**
 * Whether a request may come from where it says. Web pages are refused: browsers always send
 * their real http(s) Origin on these requests, so no site can drive the bridge. An extension
 * may send its own origin (chrome-extension:// in Chrome, possibly extension:// in Edge) or,
 * per Chrome's documentation for hosts it has permission for, none at all. The pairing code
 * and token are what actually authorise a connector.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (origin === undefined || origin === '') return true
  return /^(chrome-)?extension:\/\/[a-p]{32}$/.test(origin)
}
