function cleanTrackTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/\s*[\(\[](feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*$/gi, '')
    .replace(/\s*-\s*(single|deluxe|remastered|live|mono|stereo)$/gi, '')
    .replace(/\s*\(remastered(\s*\d+)?\)$/gi, '')
    .trim()
}

function cleanAlbum(album: string): string {
  if (!album) return ''
  return album
    .replace(/\s*[\(\[](deluxe|bonus|remastered|anniversary|expanded|special|edition|version|explicit).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(deluxe|bonus|remastered|anniversary|expanded|special|edition|version|explicit).*$/gi, '')
    .replace(/\s*-\s*(single|ep)$/gi, '')
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
    .replace(/\s+(&|and|\/)\s+.*$/gi, '')
    .trim()
}

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tracksMatch(a: string, b: string): boolean {
  const cA = norm(cleanTrackTitle(a))
  const cB = norm(cleanTrackTitle(b))
  if (!cA || !cB) return false
  if (cA === cB) return true
  if (cA.startsWith(cB + ' ') || cB.startsWith(cA + ' ')) return true
  return false
}

function artistsMatch(a: string, b: string): boolean {
  const cA = norm(cleanArtist(a)).replace(/^the\s+/, '')
  const cB = norm(cleanArtist(b)).replace(/^the\s+/, '')
  if (!cA || !cB) return true
  if (cA === cB) return true
  if ((cA === 'ye' && cB === 'kanye west') || (cA === 'kanye west' && cB === 'ye')) return true
  if (cA.startsWith(cB + ' ') || cB.startsWith(cA + ' ')) return true
  return false
}

function albumsMatch(a: string, b: string): boolean {
  const cA = norm(cleanAlbum(a)).replace(/^the\s+/, '')
  const cB = norm(cleanAlbum(b)).replace(/^the\s+/, '')
  if (!cA || !cB) return false
  if (cA === cB) return true
  if (cA.startsWith(cB + ' ') || cB.startsWith(cA + ' ')) return true
  return false
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
    const existing = this.cache.get(rawKey) || this.cache.get(cleanKey)
    if (existing && (existing.startsWith('http://') || existing.startsWith('https://')) && url.startsWith('data:')) {
      return
    }
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
    const cachedRaw = this.cache.get(key)
    if (cachedRaw && cachedRaw.startsWith('http')) {
      return cachedRaw
    }
    
    const cachedClean = this.cache.get(cleanKey)
    if (cachedClean && cachedClean.startsWith('http')) {
      return cachedClean
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
    const validArtist = cleanA && cleanA.toLowerCase() !== 'unknown artist' ? cleanA : ''
    const isGenericAlbum = !album || norm(album) === norm(title) || norm(album).includes('single')

    // 1. First attempt: Search iTunes by ALBUM if a valid album name is present
    if (!isGenericAlbum && validArtist) {
      try {
        const term = encodeURIComponent(`${album} ${validArtist}`)
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=5`, {
          signal: AbortSignal.timeout(3_000)
        })
        if (res.ok) {
          const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string; collectionName?: string; artistName?: string }> }
          if (data.results && data.results.length > 0) {
            for (const item of data.results) {
              if (item.artworkUrl100 && albumsMatch(album!, item.collectionName || '') && artistsMatch(artist, item.artistName || '')) {
                const highRes = item.artworkUrl100.replace(/100x100bb\.(jpg|png|webp)/i, '1200x1200bb.$1')
                this.cache.set(key, highRes)
                this.cache.set(cleanKey, highRes)
                this.enforceCacheLimit()
                return highRes
              }
            }
          }
        }
      } catch {
        // Fall through to song search
      }
    }

    // 2. Second attempt: Search iTunes by SONG with strict candidate verification
    const queries = [
      validArtist ? `${cleanT} ${validArtist}` : cleanT,
      validArtist ? `${title} ${artist}` : title,
      cleanT
    ].filter((q): q is string => Boolean(q && q.trim()))

    for (const q of queries) {
      try {
        const term = encodeURIComponent(q.trim())
        const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=10`, {
          signal: AbortSignal.timeout(3_000)
        })
        if (!res.ok) continue
        const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string; trackName?: string; artistName?: string; collectionName?: string }> }
        if (data.results && data.results.length > 0) {
          for (const item of data.results) {
            if (!item.artworkUrl100) continue
            const isTrackMatch = tracksMatch(title, item.trackName || '')
            const isArtistMatch = artistsMatch(artist, item.artistName || '')
            const isAlbumMatch = album ? albumsMatch(album, item.collectionName || '') : false

            if ((isTrackMatch && isArtistMatch) || (isAlbumMatch && isArtistMatch)) {
              const highRes = item.artworkUrl100.replace(/100x100bb\.(jpg|png|webp)/i, '1200x1200bb.$1')
              this.cache.set(key, highRes)
              this.cache.set(cleanKey, highRes)
              this.enforceCacheLimit()
              return highRes
            }
          }
        }
      } catch {
        // Try next query
      }
    }

    // 3. Third attempt: Deezer Album search with verification
    if (!isGenericAlbum && validArtist) {
      try {
        const term = encodeURIComponent(`${album} ${validArtist}`)
        const res = await fetch(`https://api.deezer.com/search/album?q=${term}&limit=5`, {
          signal: AbortSignal.timeout(2_500)
        })
        if (res.ok) {
          const data = (await res.json()) as { data?: Array<{ title?: string; artist?: { name?: string }; cover_xl?: string; cover_big?: string; cover_medium?: string }> }
          if (data.data && data.data.length > 0) {
            for (const item of data.data) {
              if (albumsMatch(album!, item.title || '') && artistsMatch(artist, item.artist?.name || '')) {
                const cover = item.cover_xl || item.cover_big || item.cover_medium
                if (cover) {
                  this.cache.set(key, cover)
                  this.cache.set(cleanKey, cover)
                  this.enforceCacheLimit()
                  return cover
                }
              }
            }
          }
        }
      } catch {
        // Fall through
      }
    }

    // 4. Fourth attempt: Deezer Track search with verification
    for (const q of queries.slice(0, 2)) {
      try {
        const term = encodeURIComponent(q.trim())
        const res = await fetch(`https://api.deezer.com/search?q=${term}&limit=5`, {
          signal: AbortSignal.timeout(2_500)
        })
        if (!res.ok) continue
        const data = (await res.json()) as {
          data?: Array<{
            title?: string
            artist?: { name?: string }
            album?: {
              title?: string
              cover_xl?: string
              cover_big?: string
              cover_medium?: string
            }
          }>
        }
        if (data.data && data.data.length > 0) {
          for (const item of data.data) {
            const isTrackMatch = tracksMatch(title, item.title || '')
            const isArtistMatch = artistsMatch(artist, item.artist?.name || '')
            const isAlbumMatch = album ? albumsMatch(album, item.album?.title || '') : false

            if ((isTrackMatch && isArtistMatch) || (isAlbumMatch && isArtistMatch)) {
              const albumObj = item.album
              const cover = albumObj?.cover_xl || albumObj?.cover_big || albumObj?.cover_medium
              if (cover) {
                this.cache.set(key, cover)
                this.cache.set(cleanKey, cover)
                this.enforceCacheLimit()
                return cover
              }
            }
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
