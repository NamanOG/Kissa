import type { LyricsOutcome, LyricsRequest, LyricsResponse } from '../../types/lyrics'
import { LyricsCache, createFileBackend } from './LyricsCache'

const LRCLIB_BASE = 'https://lrclib.net/api'
const ITUNES_SEARCH = 'https://itunes.apple.com/search'

/**
 * One lookup never runs longer than this, however many fallbacks it tries. LRCLIB
 * answers most requests in under a second but individual responses were measured
 * at 5-7 s, so a single request may take a while; the whole chain may not.
 */
const LOOKUP_DEADLINE_MS = 20_000
/** Per request. Long enough for LRCLIB's slow-but-successful responses. */
const REQUEST_TIMEOUT_MS = 10_000
/** LRCLIB asks clients to honour Retry-After. Waits longer than this end the lookup instead. */
const MAX_RETRY_WAIT_MS = 4_000
const MAX_RETRIES_PER_REQUEST = 2
/** A song LRCLIB definitely does not have is not asked for again for a while. */
const MISS_COOLDOWN_MS = 30 * 60 * 1000
const MEMORY_LIMIT = 200
const DIAGNOSTICS_LIMIT = 50

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

export function cleanTrackTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/\s*[\(\[](feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*?[\)\]]/gi, '')
    .replace(/\s*-\s*(feat\.|ft\.|with|explicit|remastered|deluxe|version|bonus|live|single|anniversary|official|audio|video|edit|mono|stereo|expanded).*$/gi, '')
    .replace(/\s*-\s*(single|deluxe|remastered|live|mono|stereo)$/gi, '')
    .replace(/\s*-\s*\d{4}\s+remaster(ed)?.*$/gi, '')
    .replace(/\s*\(remastered(\s*\d+)?\)$/gi, '')
    .trim()
}

export function cleanArtist(artist: string): string {
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
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\(\[].*?[\)\]]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function titleMatches(want: string, got: string): boolean {
  const wantTitle = normalizeForMatch(cleanTrackTitle(want) || want)
  const gotTitle = normalizeForMatch(cleanTrackTitle(got))
  if (!wantTitle || !gotTitle) return false
  return (
    wantTitle === gotTitle ||
    (Math.min(wantTitle.length, gotTitle.length) >= 4 &&
      (wantTitle.includes(gotTitle) || gotTitle.includes(wantTitle)))
  )
}

/**
 * Players list several artists differently ("A, B", "A & B", "A feat. B") and the
 * catalogue may credit any one of them, so every credited name counts.
 */
function artistMatches(want: string, got: string): boolean {
  const wantArtist = normalizeForMatch(want)
  const gotArtist = normalizeForMatch(got || '')
  if (!wantArtist || !gotArtist) return true
  if (wantArtist.includes(gotArtist) || gotArtist.includes(wantArtist)) return true
  const wantWords = new Set(wantArtist.split(' ').filter((w) => w.length > 2 && !ARTIST_FILLER.has(w)))
  return gotArtist.split(' ').some((w) => wantWords.has(w))
}

const ARTIST_FILLER = new Set(['the', 'and', 'feat', 'featuring', 'with', 'los', 'las', 'les', 'die', 'der'])

/** A search can return other songs entirely; only keep results for this title and artist. */
function isSameSong(item: LRCLIBItem, target: LyricsTarget): boolean {
  return (
    titleMatches(target.title, item.trackName || item.name || '') &&
    artistMatches(target.artist, item.artistName || '')
  )
}

const hasText = (value?: string | null): value is string =>
  typeof value === 'string' && value.trim().length > 0

function response(
  status: LyricsOutcome,
  item?: Partial<LRCLIBItem>,
  fallbackDuration?: number
): LyricsResponse {
  const duration = item?.duration && item.duration > 0 ? Math.round(item.duration) : fallbackDuration
  return {
    status,
    syncedLyrics: status === 'synced' ? item?.syncedLyrics || null : null,
    plainLyrics: status === 'synced' || status === 'plain' ? (hasText(item?.plainLyrics) ? item!.plainLyrics! : null) : null,
    instrumental: status === 'instrumental',
    duration: duration && duration > 0 ? duration : undefined
  }
}

function stripTimestamps(lrc: string): string {
  return lrc
    .split('\n')
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean)
    .join('\n')
}

/** Reads one LRCLIB record. Null when it carries nothing usable at all. */
function fromRecord(item: Partial<LRCLIBItem>, fallbackDuration?: number): LyricsResponse | null {
  if (hasText(item.syncedLyrics)) return response('synced', item, fallbackDuration)
  if (hasText(item.plainLyrics)) return response('plain', item, fallbackDuration)
  if (item.instrumental === true) return response('instrumental', item, fallbackDuration)
  return null
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

  // 1. Timed lyrics, from the same recording when the length is known.
  const synced = candidates.filter((item) => hasText(item.syncedLyrics))
  if (duration > 0) {
    const sameRecording = synced
      .filter((item) => distance(item) <= SYNC_DURATION_TOLERANCE_SECONDS)
      .sort(byDuration)
    if (sameRecording.length > 0) return response('synced', sameRecording[0])
  } else if (synced.length > 0) {
    return response('synced', synced[0])
  }

  // 2. Words without timing. Timed lyrics from another cut are offered this way too:
  //    the words are right even though the timestamps are not.
  const withWords = candidates.filter((item) => hasText(item.plainLyrics) || hasText(item.syncedLyrics))
  if (withWords.length > 0) {
    if (duration > 0) withWords.sort(byDuration)
    const best = withWords[0]
    return response('plain', {
      ...best,
      plainLyrics: hasText(best.plainLyrics) ? best.plainLyrics : stripTimestamps(best.syncedLyrics || '')
    })
  }

  const instrumentalItem = candidates.find((item) => item.instrumental === true)
  if (instrumentalItem) return response('instrumental', instrumentalItem)

  return null
}

/** Seconds, or an HTTP date. Undefined when absent or unreadable. */
export function parseRetryAfter(header: string | null, now: number): number | undefined {
  if (!header) return undefined
  const seconds = Number(header.trim())
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(0, date - now)
  return undefined
}

type Attempt =
  | { kind: 'ok'; body: unknown }
  | { kind: 'not-found' }
  | { kind: 'transient' }

interface LookupStats {
  requests: number
  transient: number
}

export interface LyricsLookupRecord {
  at: number
  ms: number
  from: 'memory' | 'disk' | 'network' | 'cooldown'
  outcome: LyricsOutcome
  requests: number
  transient: number
}

export interface LyricsServiceOptions {
  fetch?: typeof fetch
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  cache?: LyricsCache
  clientName?: string
}

function trackKey(request: LyricsRequest): string {
  const dur = request.duration > 0 ? Math.round(request.duration) : 0
  return [
    request.title.trim().toLowerCase(),
    request.artist.trim().toLowerCase(),
    (request.album || '').trim().toLowerCase(),
    dur
  ].join('\u0000')
}

export class LyricsService {
  private static instance: LyricsService

  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>
  private readonly cache: LyricsCache
  private readonly headers: Record<string, string>

  /** Answers found this session, newest last. */
  private readonly memory = new Map<string, LyricsResponse>()
  /** Lookups in progress. A second asker for the same recording shares the first lookup. */
  private readonly inFlight = new Map<string, Promise<LyricsResponse>>()
  /** Recordings LRCLIB said it does not have, and until when to believe it. */
  private readonly misses = new Map<string, number>()
  /** LRCLIB asked us to stay away until then (a long Retry-After). */
  private blockedUntil = 0
  private readonly diagnostics: LyricsLookupRecord[] = []

  constructor(options: LyricsServiceOptions = {}) {
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args))
    this.now = options.now ?? Date.now
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.cache = options.cache ?? new LyricsCache(null)
    const client = options.clientName ?? 'Kissa (https://github.com/NamanOG/Kissa)'
    this.headers = { 'Lrclib-Client': client, 'User-Agent': client }
  }

  /** Call once at start-up, before the first lookup, to keep lyrics across restarts. */
  public static configure(options: { cacheFile?: string; appVersion?: string }): void {
    LyricsService.instance = new LyricsService({
      cache: new LyricsCache(options.cacheFile ? createFileBackend(options.cacheFile) : null),
      clientName: `Kissa/${options.appVersion || 'dev'} (https://github.com/NamanOG/Kissa)`
    })
  }

  public static getInstance(): LyricsService {
    if (!LyricsService.instance) {
      LyricsService.instance = new LyricsService()
    }
    return LyricsService.instance
  }

  /** Recent lookups: timing, request count and outcome only, never titles or lyrics. */
  public getDiagnostics(): LyricsLookupRecord[] {
    return [...this.diagnostics]
  }

  public flush(): void {
    this.cache.flush()
  }

  public clearCache(): void {
    this.memory.clear()
    this.misses.clear()
    this.cache.clear()
  }

  public getLyrics(request: LyricsRequest): Promise<LyricsResponse> {
    const started = this.now()
    if (!request?.title?.trim() || !request.artist?.trim()) return Promise.resolve(response('not-found'))
    if (request.title === 'Unknown Title' || request.artist === 'Unknown Artist') {
      return Promise.resolve(response('not-found'))
    }

    const key = trackKey(request)

    const remembered = this.memory.get(key)
    if (remembered) {
      this.record(started, 'memory', remembered.status, { requests: 0, transient: 0 })
      return Promise.resolve(remembered)
    }
    const stored = this.cache.get(key)
    if (stored) {
      this.remember(key, stored)
      this.record(started, 'disk', stored.status, { requests: 0, transient: 0 })
      return Promise.resolve(stored)
    }

    const missUntil = this.misses.get(key)
    if (missUntil && !request.force) {
      if (missUntil > this.now()) {
        this.record(started, 'cooldown', 'not-found', { requests: 0, transient: 0 })
        return Promise.resolve(response('not-found'))
      }
      this.misses.delete(key)
    }

    const pending = this.inFlight.get(key)
    if (pending) return pending

    const stats: LookupStats = { requests: 0, transient: 0 }
    const lookup = this.lookup(request, stats)
      .catch((err): LyricsResponse => {
        console.warn('[LyricsService] Lookup failed unexpectedly:', err)
        return response('unavailable')
      })
      .then((result) => {
        this.inFlight.delete(key)
        if (result.status === 'not-found') {
          this.misses.set(key, this.now() + MISS_COOLDOWN_MS)
        } else if (result.status !== 'unavailable') {
          this.misses.delete(key)
          this.remember(key, result)
          this.cache.set(key, result)
        }
        this.record(started, 'network', result.status, stats)
        return result
      })
    this.inFlight.set(key, lookup)
    return lookup
  }

  private remember(key: string, value: LyricsResponse): void {
    this.memory.delete(key)
    this.memory.set(key, value)
    if (this.memory.size > MEMORY_LIMIT) {
      const oldest = this.memory.keys().next().value
      if (oldest !== undefined) this.memory.delete(oldest)
    }
  }

  private record(started: number, from: LyricsLookupRecord['from'], outcome: LyricsOutcome, stats: LookupStats): void {
    const entry: LyricsLookupRecord = {
      at: started,
      ms: Math.max(0, this.now() - started),
      from,
      outcome,
      requests: stats.requests,
      transient: stats.transient
    }
    this.diagnostics.push(entry)
    if (this.diagnostics.length > DIAGNOSTICS_LIMIT) this.diagnostics.shift()
    if (from === 'network') {
      console.info(
        `[LyricsService] ${outcome} in ${entry.ms}ms, ${stats.requests} request(s)` +
          (stats.transient ? `, ${stats.transient} throttled/failed` : '')
      )
    }
  }

  /**
   * Sequential, never parallel (LRCLIB asks for that), stopping at the first timed match.
   * Order: exact lookups by length, then searches, then - when the player gave no
   * length - one length from iTunes for a final exact lookup.
   */
  private async lookup(request: LyricsRequest, stats: LookupStats): Promise<LyricsResponse> {
    const deadline = this.now() + LOOKUP_DEADLINE_MS
    if (this.blockedUntil > this.now()) return response('unavailable')

    const title = request.title.trim()
    const artist = request.artist.trim()
    const album = (request.album || '').trim()
    const cleanTitle = cleanTrackTitle(title) || title
    const cleanArt = cleanArtist(artist) || artist
    let duration = request.duration > 0 ? Math.round(request.duration) : 0

    const asked = new Set<string>()
    let words: LyricsResponse | null = null
    let instrumental: LyricsResponse | null = null

    /** Runs one step. True when the lookup is finished (timed lyrics found, or LRCLIB unreachable). */
    type StepResult = 'done' | 'unreachable' | 'continue'
    let found: LyricsResponse | null = null

    const consider = (result: LyricsResponse | null): StepResult => {
      if (!result) return 'continue'
      if (result.status === 'synced') {
        found = result
        return 'done'
      }
      if (result.status === 'plain' && !words) words = result
      if (result.status === 'instrumental' && !instrumental) instrumental = result
      return 'continue'
    }

    const get = async (t: string, a: string, al: string, d: number): Promise<StepResult> => {
      const params = new URLSearchParams({ track_name: t, artist_name: a })
      if (al) params.set('album_name', al)
      params.set('duration', String(d))
      const attempt = await this.ask(`${LRCLIB_BASE}/get?${params}`, asked, deadline, stats)
      if (attempt === null) return 'continue'
      if (attempt.kind === 'transient') return 'unreachable'
      if (attempt.kind === 'not-found') return 'continue'
      const item = attempt.body as Partial<LRCLIBItem>
      // An exact lookup can still return a different song when the catalogue is sparse.
      if (item.trackName && !isSameSong(item as LRCLIBItem, { title, artist })) return 'continue'
      return consider(fromRecord(item, d))
    }

    const search = async (params: URLSearchParams, d: number): Promise<StepResult> => {
      const attempt = await this.ask(`${LRCLIB_BASE}/search?${params}`, asked, deadline, stats)
      if (attempt === null) return 'continue'
      if (attempt.kind === 'transient') return 'unreachable'
      if (attempt.kind === 'not-found') return 'continue'
      const items = Array.isArray(attempt.body) ? (attempt.body as LRCLIBItem[]) : []
      return consider(pickBestLyricsResult(items, { title, artist, duration: d }))
    }

    const steps: Array<() => Promise<StepResult>> = []
    if (duration > 0) {
      if (album) steps.push(() => get(title, artist, album, duration))
      steps.push(() => get(title, artist, '', duration))
      steps.push(() => get(cleanTitle, cleanArt, '', duration))
    }
    steps.push(() => search(new URLSearchParams({ track_name: title, artist_name: artist }), duration))
    steps.push(() => search(new URLSearchParams({ track_name: cleanTitle, artist_name: cleanArt }), duration))
    steps.push(() => search(new URLSearchParams({ q: `${cleanTitle} ${cleanArt}` }), duration))
    steps.push(() =>
      words ? Promise.resolve<StepResult>('continue') : search(new URLSearchParams({ q: `${title} ${artist}` }), duration)
    )

    let unreachable = false
    for (const step of steps) {
      if (this.now() >= deadline) {
        unreachable = true
        break
      }
      const result = await step()
      if (result === 'done') return found!
      if (result === 'unreachable') {
        unreachable = true
        break
      }
    }

    // No length from the player and nothing timed yet: borrow the length of the same
    // song from iTunes and try one exact lookup with it.
    if (!unreachable && duration === 0 && !words && this.now() < deadline) {
      const borrowed = await this.durationFromItunes(cleanTitle, cleanArt, deadline)
      if (borrowed) {
        duration = borrowed
        const result = await get(cleanTitle, cleanArt, '', duration)
        if (result === 'done') return found!
        if (result === 'unreachable') unreachable = true
      }
    }

    if (words) return words
    // A bad catalogue entry can mark a sung track "instrumental"; it is only believed
    // when nothing with words turned up and LRCLIB was reachable throughout.
    if (unreachable) return response('unavailable')
    if (instrumental) return instrumental
    return response('not-found')
  }

  /**
   * One LRCLIB request, honouring Retry-After for 429/5xx. Null when this exact request
   * was already made during the lookup.
   */
  private async ask(url: string, asked: Set<string>, deadline: number, stats: LookupStats): Promise<Attempt | null> {
    if (asked.has(url)) return null
    asked.add(url)

    for (let attempt = 0; ; attempt++) {
      const remaining = deadline - this.now()
      if (remaining < 250) return { kind: 'transient' }
      stats.requests++
      let res: Response
      try {
        res = await this.fetchImpl(url, {
          headers: this.headers,
          signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining))
        })
      } catch {
        // Offline or timed out. Retrying straight away rarely helps either.
        stats.transient++
        return { kind: 'transient' }
      }

      if (res.ok) {
        try {
          return { kind: 'ok', body: await res.json() }
        } catch {
          stats.transient++
          return { kind: 'transient' }
        }
      }
      if (res.status === 404) return { kind: 'not-found' }

      if (res.status === 429 || res.status >= 500) {
        stats.transient++
        const retryAfter = parseRetryAfter(res.headers.get('retry-after'), this.now())
        const wait = retryAfter ?? 1000 * (attempt + 1)
        if (retryAfter !== undefined && retryAfter > MAX_RETRY_WAIT_MS) {
          this.blockedUntil = this.now() + retryAfter
          return { kind: 'transient' }
        }
        if (attempt >= MAX_RETRIES_PER_REQUEST || this.now() + wait + 250 >= deadline) {
          return { kind: 'transient' }
        }
        await this.sleep(wait)
        continue
      }

      // Any other refusal (400 and the like) is about this request's wording, not the service.
      return { kind: 'not-found' }
    }
  }

  private async durationFromItunes(title: string, artist: string, deadline: number): Promise<number | null> {
    const remaining = deadline - this.now()
    if (remaining < 500) return null
    try {
      const params = new URLSearchParams({ term: `${title} ${artist}`, entity: 'song', limit: '5' })
      const res = await this.fetchImpl(`${ITUNES_SEARCH}?${params}`, {
        signal: AbortSignal.timeout(Math.min(4_000, remaining))
      })
      if (!res.ok) return null
      const data = (await res.json()) as {
        results?: Array<{ trackName?: string; artistName?: string; trackTimeMillis?: number }>
      }
      // Only a result that is this song: the first hit is often a cover or another song.
      const match = data.results?.find(
        (r) =>
          r.trackTimeMillis &&
          titleMatches(title, r.trackName || '') &&
          artistMatches(artist, r.artistName || '')
      )
      return match?.trackTimeMillis ? Math.round(match.trackTimeMillis / 1000) : null
    } catch {
      return null
    }
  }
}
