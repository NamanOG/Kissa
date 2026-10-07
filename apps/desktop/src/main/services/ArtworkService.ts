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

/**
 * Exact edition match. Unlike albumsMatch it does not strip "(Villains Version)", "(Deluxe)" etc.,
 * because different editions of an album frequently ship with different covers.
 */
function albumsMatchExact(a: string, b: string): boolean {
  const cA = norm(a).replace(/^the\s+/, '')
  const cB = norm(b).replace(/^the\s+/, '')
  return !!cA && cA === cB
}

/**
 * Used when the player already supplied a cover. Exact edition match, or - when the player's
 * album carries no edition qualifier of its own - the same album under a decorated name
 * (e.g. a catalogue listing "(Deluxe)"). A qualified album such as "(Villains Version)" must
 * never fall back to its base album.
 */
function albumsMatchStrict(a: string, b: string): boolean {
  if (albumsMatchExact(a, b)) return true
  if (norm(cleanAlbum(a)) !== norm(a)) return false
  return albumsMatch(a, b)
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

  public getCachedArtwork(title: string, artist: string, album?: string): string | undefined {
    const rawKey = this.getKey(title, artist, album)
    const cached = this.cache.get(rawKey)
    if (cached) return cached
    const cleanKey = this.getCleanKey(title, artist, album)
    return this.cache.get(cleanKey)
  }

  public setCachedArtwork(title: string, artist: string, url: string, album?: string): void {
    if (!title || !url) return
    const rawKey = this.getKey(title, artist, album)
    const cleanKey = this.getCleanKey(title, artist, album)
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

  /**
   * @param allowTrackMatch Accept a cover found by song title when the album cannot be
   * matched. Only safe when the player supplied no artwork of its own: the same song
   * appears on singles, albums and compilations with different covers.
   */
  public async fetchArtwork(
    title: string,
    artist: string,
    album?: string,
    allowTrackMatch: boolean = true
  ): Promise<string | null> {
    if (!title || title === 'Unknown Title') return null
    const key = this.getKey(title, artist, album)
    const cleanKey = this.getCleanKey(title, artist, album)
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

    const fetchPromise = this.performFetchArtwork(title, artist, album, key, cleanKey, allowTrackMatch)
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
    cleanKey: string,
    allowTrackMatch: boolean
  ): Promise<string | null> {
    const cleanT = cleanTrackTitle(title)
    const cleanA = cleanArtist(artist)
    const validArtist = cleanA && cleanA.toLowerCase() !== 'unknown artist' ? cleanA : ''
    const isGenericAlbum = !album || norm(album) === norm(title) || norm(album).includes('single')
    // The player already has a cover: only replace it with the identical edition's cover.
    const strict = !allowTrackMatch
    const matchAlbum = strict ? albumsMatchStrict : albumsMatch
    console.log('[ArtworkService] lookup', { title, artist, album, strict })

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
            const ranked = [...data.results].sort(
              (x, y) => Number(!albumsMatchExact(album!, x.collectionName || '')) - Number(!albumsMatchExact(album!, y.collectionName || '')) ||
                (x.collectionName || '').length - (y.collectionName || '').length
            )
            console.log('[ArtworkService] itunes albums', ranked.map((r) => `${r.collectionName} / ${r.artistName}`))
            for (const item of ranked) {
              if (item.artworkUrl100 && matchAlbum(album!, item.collectionName || '') && artistsMatch(artist, item.artistName || '')) {
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
            const isAlbumMatch = album ? matchAlbum(album, item.collectionName || '') : false

            if ((allowTrackMatch && isTrackMatch && isArtistMatch) || (isAlbumMatch && isArtistMatch)) {
              const highRes = item.artworkUrl100.replace(/100x100bb\.(jpg|png|webp)/i, '1200x1200bb.$1')
              this.cache.set(key, highRes)
              this.cache.set(cleanKey, highRes)
              this.enforceCacheLimit()
              return highRes
            }
          }
        }
      } catch {
      }
    }

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
              if (matchAlbum(album!, item.title || '') && artistsMatch(artist, item.artist?.name || '')) {
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
      }
    }

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
            const isAlbumMatch = album ? matchAlbum(album, item.album?.title || '') : false

            if ((allowTrackMatch && isTrackMatch && isArtistMatch) || (isAlbumMatch && isArtistMatch)) {
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
      }
    }

    return null
  }

  private getKey(title: string, artist: string, album?: string): string {
    return `${title.toLowerCase().trim()}|${(artist || '').toLowerCase().trim()}|${(album || '').toLowerCase().trim()}`
  }

  private getCleanKey(title: string, artist: string, album?: string): string {
    return `${cleanTrackTitle(title).toLowerCase().trim()}|${cleanArtist(artist).toLowerCase().trim()}|${(album || '').toLowerCase().trim()}`
  }
}
