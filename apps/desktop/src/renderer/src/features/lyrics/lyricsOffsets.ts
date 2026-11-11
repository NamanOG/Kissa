/**
 * The lyrics timing nudge ("..." menu, Settings), remembered per player: Apple Music, Spotify and
 * a browser each keep their own timelines, so a correction made for one should not move the others.
 * Kept in localStorage as { [player]: seconds }. An older single value (kissa_lyrics_offset)
 * becomes the starting point for every player that has no value of its own yet.
 */
const KEY = 'kissa_lyrics_offsets'
const LEGACY_KEY = 'kissa_lyrics_offset'
const FALLBACK = '*'

export const LYRICS_OFFSET_LIMIT = 2

/** One name per player family, so Apple Music's changing package ids share one value. */
export function lyricsSourceKey(sourceAppId: string | undefined): string {
  const id = (sourceAppId ?? '').toLowerCase()
  if (!id || id === 'kissa-idle' || id === 'kissa') return 'kissa'
  if (id.includes('applemusic')) return 'apple-music'
  if (id.includes('spotify')) return 'spotify'
  if (id.includes('youtube')) return 'youtube-music'
  return id.slice(0, 80)
}

const clamp = (v: number): number =>
  Math.max(-LYRICS_OFFSET_LIMIT, Math.min(LYRICS_OFFSET_LIMIT, Math.round(v * 10) / 10))

function readAll(): Record<string, number> {
  const out: Record<string, number> = {}
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as unknown
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = clamp(v)
      }
    }
    if (!(FALLBACK in out)) {
      const legacy = parseFloat(localStorage.getItem(LEGACY_KEY) || '')
      if (Number.isFinite(legacy) && legacy !== 0) out[FALLBACK] = clamp(legacy)
    }
  } catch {
    /* storage unavailable: every player starts at 0 */
  }
  return out
}

export function loadLyricsOffset(sourceAppId: string | undefined): number {
  const all = readAll()
  const own = all[lyricsSourceKey(sourceAppId)]
  return own ?? all[FALLBACK] ?? 0
}

export function saveLyricsOffset(sourceAppId: string | undefined, offset: number): number {
  const value = clamp(Number.isFinite(offset) ? offset : 0)
  try {
    const all = readAll()
    all[lyricsSourceKey(sourceAppId)] = value
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* not remembered; still applied for this session */
  }
  return value
}
