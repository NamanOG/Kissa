import type { LyricsRequest, LyricsResponse } from '../../types/lyrics'

const LYRICS_GET_ENDPOINT = 'https://lrclib.net/api/get'
const LYRICS_SEARCH_ENDPOINT = 'https://lrclib.net/api/search'
const CACHE_LIMIT = 100
const USER_AGENT_HEADER = { 'Lrclib-Client': 'Kissa/2.0 (https://github.com/NamanOG/Kissa)' }

export interface LRCLIBItem {
  id?: number
  name?: string
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function cleanTrackTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/\s*[\(\[](feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*$/gi, '')
    .replace(/\s*-\s*(single|deluxe|remastered|live|mono|stereo)$/gi, '')
    .replace(/\s*\(remastered(\s*\d+)?\)$/gi, '')
    .trim()
}

function cleanArtist(artist: string): string {
  if (!artist) return ''
  let cleaned = artist
  if (cleaned.includes(' — ')) {
    cleaned = cleaned.split(' — ')[0]
  } else if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ')
    if (parts[0].length > 1 && parts[1].length > 1) {
      cleaned = parts[0]
    }
  }
  return cleaned
    .replace(/\s*(feat\.|ft\.|featuring).*$/gi, '')
    .replace(/\s*,\s*.*$/g, '')
    .trim()
}

/**
 * Timed lyrics only line up with the recording they were timed against. LRCLIB's own
 * exact lookup allows two seconds either way; a search hit further out than this is a
 * different cut (single edit, live take, remaster with a longer intro) and its
 * timestamps would drift against what is playing.
 */
const SYNC_DURATION_TOLERANCE_SECONDS = 3

/** What the track being played is, as far as the search results need to know. */
export interface LyricsTarget {
  title: string
  artist: string
  duration?: number
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\(\[].*?[\)\]]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** A search can return other songs entirely; only keep results for this title and artist. */
function isSameSong(item: LRCLIBItem, target: LyricsTarget): boolean {
  const wantTitle = normalizeForMatch(cleanTrackTitle(target.title) || target.title)
  const gotTitle = normalizeForMatch(cleanTrackTitle(item.trackName || item.name || ''))
  if (!wantTitle || !gotTitle) return false
  const titleMatches =
    wantTitle === gotTitle ||
    (Math.min(wantTitle.length, gotTitle.length) >= 4 &&
      (wantTitle.includes(gotTitle) || gotTitle.includes(wantTitle)))
  if (!titleMatches) return false

  const wantArtist = normalizeForMatch(cleanArtist(target.artist) || target.artist)
  const gotArtist = normalizeForMatch(item.artistName || '')
  if (!wantArtist || !gotArtist) return true
  if (wantArtist.includes(gotArtist) || gotArtist.includes(wantArtist)) return true
  const wantWords = new Set(wantArtist.split(' ').filter((w) => w.length > 2))
  return gotArtist.split(' ').some((w) => wantWords.has(w))
}

function toResponse(item: LRCLIBItem, synced: boolean): LyricsResponse {
  return {
    syncedLyrics: synced ? item.syncedLyrics || null : null,
    plainLyrics: item.plainLyrics || null,
    instrumental: item.instrumental === true,
    duration: item.duration && item.duration > 0 ? Math.round(item.duration) : undefined
  }
}

export function pickBestLyricsResult(
  results: LRCLIBItem[],
  target: LyricsTarget
): LyricsResponse | null {
  if (!Array.isArray(results) || results.length === 0) return null

  const candidates = results.filter((item) => isSameSong(item, target))
  if (candidates.length === 0) return null

  const duration = target.duration && target.duration > 0 ? target.duration : 0
  const distance = (item: LRCLIBItem): number => Math.abs((item.duration || 0) - duration)
  const byDuration = (a: LRCLIBItem, b: LRCLIBItem): number => distance(a) - distance(b)
  const hasText = (value?: string | null): boolean => typeof value === 'string' && value.trim().length > 0

  // 1. Timed lyrics, from the same recording when the length is known.
  const synced = candidates.filter((item) => hasText(item.syncedLyrics))
  if (duration > 0) {
    const sameRecording = synced
      .filter((item) => distance(item) <= SYNC_DURATION_TOLERANCE_SECONDS)
      .sort(byDuration)
    if (sameRecording.length > 0) return toResponse(sameRecording[0], true)
  } else if (synced.length > 0) {
    return toResponse(synced[0], true)
  }

  // 2. Words without timing. Timed lyrics from another cut are offered this way too:
  //    the words are right even though the timestamps are not.
  const withWords = candidates.filter((item) => hasText(item.plainLyrics) || hasText(item.syncedLyrics))
  if (withWords.length > 0) {
    if (duration > 0) withWords.sort(byDuration)
    const best = withWords[0]
    return toResponse(
      { ...best, plainLyrics: hasText(best.plainLyrics) ? best.plainLyrics : stripTimestamps(best.syncedLyrics || '') },
      false
    )
  }

  const instrumentalItem = candidates.find((item) => item.instrumental === true)
  if (instrumentalItem) return toResponse(instrumentalItem, false)

  return null
}

function stripTimestamps(lrc: string): string {
  return lrc
    .split('\n')
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean)
    .join('\n')
}

async function fetchDurationFromiTunes(title: string, artist: string): Promise<number | null> {
  try {
    const term = encodeURIComponent(`${title} ${artist}`)
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=3`, {
      signal: AbortSignal.timeout(4_000)
    })
    if (!res.ok) return null
    const data = (await res.json()) as { results?: Array<{ trackTimeMillis?: number }> }
    if (data.results && data.results.length > 0 && data.results[0].trackTimeMillis) {
      return Math.round(data.results[0].trackTimeMillis / 1000)
    }
  } catch {
  }
  return null
}

export class LyricsService {
  private static instance: LyricsService
  private readonly cache = new Map<string, Promise<LyricsResponse | null>>()

  public static getInstance(): LyricsService {
    if (!LyricsService.instance) {
      LyricsService.instance = new LyricsService()
    }
    return LyricsService.instance
  }

  public getLyrics(request: LyricsRequest): Promise<LyricsResponse | null> {
    if (!request.title || !request.artist) return Promise.resolve(null)
    
    if (request.title === 'Unknown Title' || request.artist === 'Unknown Artist') {
      return Promise.resolve(null)
    }

    const dur = request.duration > 10 ? Math.round(request.duration / 10) * 10 : 0
    const key = [request.title.toLowerCase(), request.artist.toLowerCase(), request.album?.toLowerCase() || '', dur].join('\0')

    const cached = this.cache.get(key)
    if (cached) return cached

    const pending = this.fetchWithFallback(request)
    this.cache.set(key, pending)
    pending.then((result) => {
      if (!result) this.cache.delete(key)
    })
    if (this.cache.size > CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    return pending
  }

  private async fetchWithFallback(request: LyricsRequest): Promise<LyricsResponse | null> {
    const cleanTitle = cleanTrackTitle(request.title)
    const cleanArt = cleanArtist(request.artist)
    let dur = request.duration > 0 ? Math.round(request.duration) : 0

    if (dur > 0 && request.album) {
      const directWithAlbum = await this.tryGet(request.title, request.artist, request.album, dur)
      if (directWithAlbum) return directWithAlbum
    }

    // Step 2: Try exact LRCLIB GET without album (avoids album naming mismatches)
    if (dur > 0) {
      const directNoAlbum = await this.tryGet(request.title, request.artist, undefined, dur)
      if (directNoAlbum) return directNoAlbum

      if (cleanTitle !== request.title || cleanArt !== request.artist) {
        const directClean = await this.tryGet(cleanTitle, cleanArt, undefined, dur)
        if (directClean) return directClean
      }
    }

    // Step 3: Search by track_name and artist_name
    // Searches below can return several recordings; the first answer with timing wins,
    // otherwise the first answer with words is kept as a fallback.
    const target: LyricsTarget = { title: request.title, artist: request.artist, duration: dur }
    let wordsOnly: LyricsResponse | null = null
    const consider = (result: LyricsResponse | null): LyricsResponse | null => {
      if (result?.syncedLyrics) return result
      if (result && !wordsOnly) wordsOnly = result
      return null
    }

    let hit = consider(await this.trySearchStructured(request.title, request.artist, target))
    if (hit) return hit

    if (cleanTitle !== request.title || cleanArt !== request.artist) {
      hit = consider(await this.trySearchStructured(cleanTitle, cleanArt, target))
      if (hit) return hit
    }

    hit = consider(await this.trySearchQuery(`${cleanTitle} ${cleanArt}`, target))
    if (hit) return hit

    if (!wordsOnly) {
      hit = consider(await this.trySearchQuery(`${request.title} ${request.artist}`, target))
      if (hit) return hit
    }
    if (wordsOnly) return wordsOnly

    // Step 5: If duration was 0 and we still don't have lyrics, try fetching duration from iTunes and retry
    if (dur === 0) {
      const itunesDur = await fetchDurationFromiTunes(cleanTitle || request.title, cleanArt || request.artist)
      if (itunesDur && itunesDur > 0) {
        dur = itunesDur
        const retryGet = await this.tryGet(cleanTitle || request.title, cleanArt || request.artist, undefined, dur)
        if (retryGet) return retryGet

        const retrySearch = await this.trySearchQuery(`${cleanTitle} ${cleanArt}`, {
          title: request.title,
          artist: request.artist,
          duration: dur
        })
        if (retrySearch) return retrySearch
      }
    }

    return null
  }

  private async tryGet(
    title: string,
    artist: string,
    album?: string,
    duration?: number
  ): Promise<LyricsResponse | null> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist
      })
      if (album) params.set('album_name', album)
      if (duration && duration > 0) params.set('duration', String(duration))

      const response = await fetch(`${LYRICS_GET_ENDPOINT}?${params.toString()}`, {
        headers: USER_AGENT_HEADER,
        signal: AbortSignal.timeout(6_000)
      })
      if (!response.ok) return null

      const payload = (await response.json()) as Partial<LRCLIBItem>
      if (payload.syncedLyrics || payload.plainLyrics || payload.instrumental) {
        return {
          syncedLyrics: typeof payload.syncedLyrics === 'string' ? payload.syncedLyrics : null,
          plainLyrics: typeof payload.plainLyrics === 'string' ? payload.plainLyrics : null,
          instrumental: payload.instrumental === true,
          duration: payload.duration && payload.duration > 0 ? Math.round(payload.duration) : duration
        }
      }
    } catch {
    }
    return null
  }

  private async trySearchStructured(
    title: string,
    artist: string,
    target: LyricsTarget
  ): Promise<LyricsResponse | null> {
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist
      })
      const response = await fetch(`${LYRICS_SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: USER_AGENT_HEADER,
        signal: AbortSignal.timeout(6_000)
      })
      if (!response.ok) return null

      const results = (await response.json()) as LRCLIBItem[]
      return pickBestLyricsResult(results, target)
    } catch {
      return null
    }
  }

  private async trySearchQuery(
    query: string,
    target: LyricsTarget
  ): Promise<LyricsResponse | null> {
    try {
      const params = new URLSearchParams({ q: query })
      const response = await fetch(`${LYRICS_SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: USER_AGENT_HEADER,
        signal: AbortSignal.timeout(6_000)
      })
      if (!response.ok) return null

      const results = (await response.json()) as LRCLIBItem[]
      return pickBestLyricsResult(results, target)
    } catch {
      return null
    }
  }
}
