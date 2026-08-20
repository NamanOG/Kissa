import type { LyricsRequest, LyricsResponse } from '../../types/lyrics'

const LYRICS_GET_ENDPOINT = 'https://lrclib.net/api/get'
const LYRICS_SEARCH_ENDPOINT = 'https://lrclib.net/api/search'
const CACHE_LIMIT = 100
const USER_AGENT_HEADER = { 'Lrclib-Client': 'Kissa/2.0 (https://github.com/NamanOG/Kissa)' }

interface LRCLIBItem {
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

function pickBestLyricsResult(results: LRCLIBItem[], targetDuration?: number): LyricsResponse | null {
  if (!Array.isArray(results) || results.length === 0) return null

  // 1. Prioritize results with syncedLyrics
  const syncedCandidates = results.filter(
    (item) => typeof item.syncedLyrics === 'string' && item.syncedLyrics.trim().length > 0
  )

  if (syncedCandidates.length > 0) {
    if (targetDuration && targetDuration > 0) {
      syncedCandidates.sort((a, b) => {
        const diffA = Math.abs((a.duration || 0) - targetDuration)
        const diffB = Math.abs((b.duration || 0) - targetDuration)
        return diffA - diffB
      })
    }
    const best = syncedCandidates[0]
    return {
      syncedLyrics: best.syncedLyrics || null,
      plainLyrics: best.plainLyrics || null,
      instrumental: best.instrumental === true,
      duration: best.duration && best.duration > 0 ? Math.round(best.duration) : undefined
    }
  }

  // 2. Plain lyrics candidates
  const plainCandidates = results.filter(
    (item) => typeof item.plainLyrics === 'string' && item.plainLyrics.trim().length > 0
  )
  if (plainCandidates.length > 0) {
    if (targetDuration && targetDuration > 0) {
      plainCandidates.sort((a, b) => {
        const diffA = Math.abs((a.duration || 0) - targetDuration)
        const diffB = Math.abs((b.duration || 0) - targetDuration)
        return diffA - diffB
      })
    }
    const best = plainCandidates[0]
    return {
      syncedLyrics: null,
      plainLyrics: best.plainLyrics || null,
      instrumental: best.instrumental === true,
      duration: best.duration && best.duration > 0 ? Math.round(best.duration) : undefined
    }
  }

  // 3. Instrumental check
  const instrumentalItem = results.find((item) => item.instrumental === true)
  if (instrumentalItem) {
    return {
      syncedLyrics: null,
      plainLyrics: null,
      instrumental: true,
      duration: instrumentalItem.duration && instrumentalItem.duration > 0 ? Math.round(instrumentalItem.duration) : undefined
    }
  }

  return null
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
    // Ignore iTunes search errors
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

    // Step 1: If duration is known, try exact LRCLIB GET with album
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
    const searchStructured = await this.trySearchStructured(request.title, request.artist, dur)
    if (searchStructured) return searchStructured

    if (cleanTitle !== request.title || cleanArt !== request.artist) {
      const searchCleanStructured = await this.trySearchStructured(cleanTitle, cleanArt, dur)
      if (searchCleanStructured) return searchCleanStructured
    }

    // Step 4: General query search
    const searchQClean = await this.trySearchQuery(`${cleanTitle} ${cleanArt}`, dur)
    if (searchQClean) return searchQClean

    const searchQRaw = await this.trySearchQuery(`${request.title} ${request.artist}`, dur)
    if (searchQRaw) return searchQRaw

    // Step 5: If duration was 0 and we still don't have lyrics, try fetching duration from iTunes and retry
    if (dur === 0) {
      const itunesDur = await fetchDurationFromiTunes(cleanTitle || request.title, cleanArt || request.artist)
      if (itunesDur && itunesDur > 0) {
        dur = itunesDur
        const retryGet = await this.tryGet(cleanTitle || request.title, cleanArt || request.artist, undefined, dur)
        if (retryGet) return retryGet

        const retrySearch = await this.trySearchQuery(`${cleanTitle} ${cleanArt}`, dur)
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
      // Ignore network errors
    }
    return null
  }

  private async trySearchStructured(
    title: string,
    artist: string,
    targetDuration?: number
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
      return pickBestLyricsResult(results, targetDuration)
    } catch {
      return null
    }
  }

  private async trySearchQuery(
    query: string,
    targetDuration?: number
  ): Promise<LyricsResponse | null> {
    try {
      const params = new URLSearchParams({ q: query })
      const response = await fetch(`${LYRICS_SEARCH_ENDPOINT}?${params.toString()}`, {
        headers: USER_AGENT_HEADER,
        signal: AbortSignal.timeout(6_000)
      })
      if (!response.ok) return null

      const results = (await response.json()) as LRCLIBItem[]
      return pickBestLyricsResult(results, targetDuration)
    } catch {
      return null
    }
  }
}
