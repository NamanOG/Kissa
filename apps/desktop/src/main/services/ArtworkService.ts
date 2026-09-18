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

export class ArtworkService {
  private static instance: ArtworkService
  private cache = new Map<string, string>()
  private inFlight = new Map<string, Promise<string | null>>()

  public static getInstance(): ArtworkService {
    if (!ArtworkService.instance) {
      ArtworkService.instance = new ArtworkService()
    }
    return ArtworkService.instance
  }

  public getCachedArtwork(title: string, artist: string): string | undefined {
    const rawKey = this.getKey(title, artist)
    const cached = this.cache.get(rawKey)
    if (cached) return cached
    const cleanKey = this.getCleanKey(title, artist)
    return this.cache.get(cleanKey)
  }

  public setCachedArtwork(title: string, artist: string, url: string): void {
    if (!title || !url) return
    const rawKey = this.getKey(title, artist)
    const cleanKey = this.getCleanKey(title, artist)
    this.cache.set(rawKey, url)
    this.cache.set(cleanKey, url)
    this.enforceCacheLimit()
  }

  private enforceCacheLimit(): void {
    if (this.cache.size > 200) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
  }

  public async fetchArtwork(title: string, artist: string, album?: string): Promise<string | null> {
    if (!title || title === 'Unknown Title') return null
    const key = this.getKey(title, artist)
    const cleanKey = this.getCleanKey(title, artist)
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!
    }
    if (this.cache.has(cleanKey)) {
      return this.cache.get(cleanKey)!
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!
    }

    const fetchPromise = this.performFetchArtwork(title, artist, album, key, cleanKey)
    this.inFlight.set(key, fetchPromise)
    this.inFlight.set(cleanKey, fetchPromise)

    try {
      return await fetchPromise
    } finally {
      this.inFlight.delete(key)
      this.inFlight.delete(cleanKey)
    }
  }

  private async performFetchArtwork(
    title: string,
    artist: string,
    album: string | undefined,
    key: string,
    cleanKey: string
  ): Promise<string | null> {
    const cleanT = cleanTrackTitle(title)
    const cleanA = cleanArtist(artist)

    const queries = [
      `${cleanT} ${cleanA}`,
      `${title} ${artist}`,
      album && cleanA ? `${album} ${cleanA}` : '',
      cleanT
    ].filter((q): q is string => Boolean(q && q.trim()))

    // 1. First attempt: Apple iTunes Search API (1200x1200 high-res)
    for (const q of queries) {
      try {
        const term = encodeURIComponent(q.trim())
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5`, {
          signal: AbortSignal.timeout(3_000)
        })
        if (!res.ok) continue
        const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string; trackName?: string; artistName?: string }> }
        if (data.results && data.results.length > 0) {
          const item = data.results.find((r) => r.artworkUrl100) || data.results[0]
          if (item?.artworkUrl100) {
            const highRes = item.artworkUrl100.replace(/100x100bb\.(jpg|png|webp)/i, '1200x1200bb.$1')
            this.cache.set(key, highRes)
            this.cache.set(cleanKey, highRes)
            this.enforceCacheLimit()
            return highRes
          }
        }
      } catch {
        // Try next query
      }
    }

    // 2. Fallback attempt: Deezer Public Search API (1000x1000 cover_xl)
    for (const q of queries.slice(0, 2)) {
      try {
        const term = encodeURIComponent(q.trim())
        const res = await fetch(`https://api.deezer.com/search?q=${term}&limit=3`, {
          signal: AbortSignal.timeout(2_500)
        })
        if (!res.ok) continue
        const data = (await res.json()) as {
          data?: Array<{
            album?: {
              cover_xl?: string
              cover_big?: string
              cover_medium?: string
            }
          }>
        }
        if (data.data && data.data.length > 0) {
          const albumObj = data.data[0].album
          const cover = albumObj?.cover_xl || albumObj?.cover_big || albumObj?.cover_medium
          if (cover) {
            this.cache.set(key, cover)
            this.cache.set(cleanKey, cover)
            this.enforceCacheLimit()
            return cover
          }
        }
      } catch {
        // Try next query
      }
    }

    return null
  }

  private getKey(title: string, artist: string): string {
    return `${title.toLowerCase().trim()}|${(artist || '').toLowerCase().trim()}`
  }

  private getCleanKey(title: string, artist: string): string {
    return `${cleanTrackTitle(title).toLowerCase().trim()}|${cleanArtist(artist).toLowerCase().trim()}`
  }
}
