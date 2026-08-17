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
    const key = [request.title, request.artist, request.album, Math.round(request.duration)].join('\u0000')
    const cached = this.cache.get(key)
    if (cached) return cached

    const pending = this.fetchLyrics(request)
    this.cache.set(key, pending)
    if (this.cache.size > CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    return pending
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
