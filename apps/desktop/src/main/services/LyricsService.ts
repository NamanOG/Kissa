import type { LyricsRequest, LyricsResponse } from '../../types/lyrics'

const LYRICS_ENDPOINT = 'https://lrclib.net/api/get'
const CACHE_LIMIT = 60

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
    const key = [request.title, request.artist, request.album, dur].join('\0')

    const cached = this.cache.get(key)
    if (cached) return cached

    const pending = this.fetchWithFallback(request)
    this.cache.set(key, pending)
    pending.then(result => {
      if (!result) this.cache.delete(key)
    })
    if (this.cache.size > CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    return pending
  }

  private async fetchWithFallback(request: LyricsRequest): Promise<LyricsResponse | null> {
    const result = await this.fetchLyrics(request)
    if (result) return result

    return this.searchLyrics(request)
  }

  private async searchLyrics(request: LyricsRequest): Promise<LyricsResponse | null> {
    try {
      const q = encodeURIComponent(`${request.title} ${request.artist}`)
      const res = await fetch(`https://lrclib.net/api/search?q=${q}`, {
        headers: { 'Lrclib-Client': 'Kissa/1.0 (https://github.com/NamanOG/Kissa)' },
        signal: AbortSignal.timeout(8_000)
      })
      if (!res.ok) return null
      const results = await res.json() as Array<Partial<LyricsResponse & { syncedLyrics: string; plainLyrics: string }>>
      if (!Array.isArray(results) || results.length === 0) return null
      const best = results[0]
      return {
        syncedLyrics: typeof best.syncedLyrics === 'string' ? best.syncedLyrics : null,
        plainLyrics: typeof best.plainLyrics === 'string' ? best.plainLyrics : null,
        instrumental: false
      }
    } catch {
      return null
    }
  }

  private async fetchLyrics(request: LyricsRequest): Promise<LyricsResponse | null> {
    const params = new URLSearchParams({
      track_name: request.title,
      artist_name: request.artist,
      album_name: request.album,
      duration: String(Math.round(request.duration))
    })

    try {
      const response = await fetch(`${LYRICS_ENDPOINT}?${params.toString()}`, {
        headers: { 'Lrclib-Client': 'Kissa/1.0 (https://github.com/NamanOG/Kissa)' },
        signal: AbortSignal.timeout(8_000)
      })
      if (!response.ok) return null

      const payload = (await response.json()) as Partial<LyricsResponse>
      return {
        syncedLyrics: typeof payload.syncedLyrics === 'string' ? payload.syncedLyrics : null,
        plainLyrics: typeof payload.plainLyrics === 'string' ? payload.plainLyrics : null,
        instrumental: payload.instrumental === true
      }
    } catch {
      return null
    }
  }
}
