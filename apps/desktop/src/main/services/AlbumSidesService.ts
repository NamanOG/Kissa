import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { plainAlbumName, sidesFromTracks, type AlbumSides, type SourceTrack } from './albumSides'

/**
 * Track lists for Sides, from MusicBrainz (its core data is CC0). Kissa asks at most once a
 * second, names itself in the User-Agent as MusicBrainz asks, prefers a vinyl release so the
 * sides are the pressing's own, and keeps answers on disk so an album is looked up once.
 */
const API = 'https://musicbrainz.org/ws/2'
const MISS_TTL_MS = 24 * 3600_000
/** Bumped when lookups change, so answers from an older lookup are asked again. */
const CACHE_VERSION = 'v3'
const MAX_ENTRIES = 3000

type CacheEntry = { at: number; sides: AlbumSides | null }

function userAgent(): string {
  return `Kissa/${app.getVersion()} ( https://kissa.glyphcode.studio )`
}

/**
 * The artist as MusicBrainz would credit the album: no "feat." part, no "Artist — Album" pairing
 * some players send. Commas stay ("Tyler, The Creator" is one artist).
 */
export function albumArtist(artist: string): string {
  return artist
    .split(' — ')[0]
    .replace(/\s*[([]?\b(feat\.?|ft\.?|featuring)\s.*$/i, '')
    .trim()
}

/** For a credit like "Kendrick Lamar & SZA", the first name, to try when the whole credit finds nothing. */
export function leadArtist(artist: string): string | null {
  const first = artist.split(/\s+(?:&|and|x|with)\s+|\s*\/\s*|;\s*/i)[0]?.trim()
  return first && first !== artist ? first : null
}

function quote(s: string): string {
  return `"${s.replace(/["\\]/g, ' ').trim()}"`
}

export class AlbumSidesService {
  private static instance: AlbumSidesService
  private cache: Record<string, CacheEntry> | null = null
  private inflight = new Map<string, Promise<AlbumSides | null>>()
  private queue: Promise<unknown> = Promise.resolve()
  private lastRequest = 0

  static getInstance(): AlbumSidesService {
    if (!AlbumSidesService.instance) AlbumSidesService.instance = new AlbumSidesService()
    return AlbumSidesService.instance
  }

  private get file(): string {
    return join(app.getPath('userData'), 'album-sides.json')
  }

  private async load(): Promise<Record<string, CacheEntry>> {
    if (this.cache) return this.cache
    try {
      this.cache = JSON.parse(await fs.readFile(this.file, 'utf8')) as Record<string, CacheEntry>
    } catch {
      this.cache = {}
    }
    return this.cache
  }

  private async save(): Promise<void> {
    if (!this.cache) return
    const entries = Object.entries(this.cache)
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].at - a[1].at)
      this.cache = Object.fromEntries(entries.slice(0, MAX_ENTRIES))
    }
    try {
      await fs.writeFile(this.file, JSON.stringify(this.cache))
    } catch {
      // Not saved; asked again next time.
    }
  }

  /**
   * One request at a time, well over a second apart. MusicBrainz answers 503 when it is busy or
   * asked too often: wait and try again, twice. Throws when there is still no answer, so a
   * failed lookup is not remembered as "no such album".
   */
  private request(url: string): Promise<any> {
    const run = async (): Promise<any> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const wait = this.lastRequest + (attempt ? 2500 * attempt : 1500) - Date.now()
        if (wait > 0) await new Promise((r) => setTimeout(r, wait))
        this.lastRequest = Date.now()
        try {
          const res = await fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
          if (res.ok) return await res.json()
          if (res.status !== 503 && res.status !== 429 && res.status < 500) throw new Error(`status ${res.status}`)
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('status ')) throw e
        }
      }
      throw new Error('unavailable')
    }
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next
  }

  async getSides(artist: string, album: string): Promise<AlbumSides | null> {
    const a = albumArtist(artist)
    const r = plainAlbumName(album || '').trim()
    if (!a || !r) return null
    const key = `${CACHE_VERSION}|${a}|${r}`.toLowerCase()
    const cache = await this.load()
    const hit = cache[key]
    if (hit && (hit.sides || Date.now() - hit.at < MISS_TTL_MS)) return hit.sides
    const pending = this.inflight.get(key)
    if (pending) return pending
    const job = this.lookup(a, r).then(
      async (sides) => {
        cache[key] = { at: Date.now(), sides }
        await this.save()
        return sides
      },
      // No answer from MusicBrainz (offline, busy): not remembered, asked again next time.
      () => null
    )
    this.inflight.set(key, job)
    try {
      return await job
    } finally {
      this.inflight.delete(key)
    }
  }

  private async lookup(artist: string, album: string): Promise<AlbumSides | null> {
    const base = `release:${quote(album)} AND artist:${quote(artist)}`
    const find = async (query: string): Promise<string | null> => {
      const res = await this.request(`${API}/release/?query=${encodeURIComponent(query)}&limit=5&fmt=json`)
      const best = (res?.releases ?? []).find((rel: any) => (rel.score ?? 0) >= 85)
      return best?.id ?? null
    }
    // A vinyl pressing first: its sides are real. Then any release; then, for a shared credit,
    // the lead artist alone.
    const lead = leadArtist(artist)
    const id =
      (await find(`${base} AND format:vinyl`)) ??
      (await find(base)) ??
      (lead ? await find(`release:${quote(album)} AND artist:${quote(lead)}`) : null)
    if (!id) return null
    const rel = await this.request(`${API}/release/${id}?inc=recordings&fmt=json`)
    const tracks: SourceTrack[] = []
    for (const medium of rel?.media ?? []) {
      for (const t of medium.tracks ?? []) {
        tracks.push({ title: String(t.title ?? ''), length: Number(t.length ?? t.recording?.length ?? 0) || 0, number: String(t.number ?? '') })
      }
    }
    return sidesFromTracks(tracks)
  }
}
