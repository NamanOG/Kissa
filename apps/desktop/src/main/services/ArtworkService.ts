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
  return artist
    .replace(/\s*(feat\.|ft\.|featuring).*$/gi, '')
    .replace(/\s*,\s*.*$/g, '')
    .trim()
}

export class ArtworkService {
  private static instance: ArtworkService
  private cache = new Map<string, string>()

  public static getInstance(): ArtworkService {
    if (!ArtworkService.instance) {
      ArtworkService.instance = new ArtworkService()
    }
    return ArtworkService.instance
  }

  public getCachedArtwork(title: string, artist: string): string | undefined {
    const key = this.getKey(title, artist)
    return this.cache.get(key)
  }

  public setCachedArtwork(title: string, artist: string, url: string): void {
    if (!title || !url) return
    const key = this.getKey(title, artist)
    this.cache.set(key, url)
  }

  public async fetchArtwork(title: string, artist: string, album?: string): Promise<string | null> {
    if (!title) return null
    const key = this.getKey(title, artist)
    if (this.cache.has(key)) {
      return this.cache.get(key)!
    }

    const cleanT = cleanTrackTitle(title)
    const cleanA = cleanArtist(artist)

    const queries = [
      `${cleanT} ${cleanA}`,
      `${title} ${artist}`,
      album && cleanA ? `${album} ${cleanA}` : '',
      cleanT
    ].filter((q): q is string => Boolean(q && q.trim()))

    for (const q of queries) {
      try {
        const term = encodeURIComponent(q.trim())
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5`, {
          signal: AbortSignal.timeout(4_000)
        })
        if (!res.ok) continue
        const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string; trackName?: string; artistName?: string }> }
        if (data.results && data.results.length > 0) {
          const item = data.results.find((r) => r.artworkUrl100) || data.results[0]
          if (item?.artworkUrl100) {
            // Replace 100x100 with 600x600 for crystal-clear high-res album cover
            const highRes = item.artworkUrl100.replace(/100x100bb\.(jpg|png|webp)/i, '600x600bb.$1')
            this.cache.set(key, highRes)
            return highRes
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
}
