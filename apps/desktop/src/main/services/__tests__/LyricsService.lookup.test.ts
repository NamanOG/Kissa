import { describe, expect, it, vi } from 'vitest'
import { LyricsService, parseRetryAfter, type LRCLIBItem } from '../LyricsService'
import { LyricsCache, type LyricsCacheBackend } from '../LyricsCache'

const TIMED = '[00:01.00] first line\n[00:05.00] second line'

type Reply = { status: number; body?: unknown; retryAfter?: string } | 'network-error'
type Route = (url: URL) => Reply | undefined

const record = (over: Partial<LRCLIBItem> = {}): LRCLIBItem => ({
  trackName: 'Paper Lanterns',
  artistName: 'The Quiet Hours',
  albumName: 'Night Shift',
  duration: 214,
  instrumental: false,
  plainLyrics: 'first line\nsecond line',
  syncedLyrics: TIMED,
  ...over
})

const request = { title: 'Paper Lanterns', artist: 'The Quiet Hours', album: 'Night Shift', duration: 214 }

function harness(route: Route, opts: { advancePerRequest?: number; backend?: LyricsCacheBackend } = {}) {
  let clock = 1_000_000
  const calls: string[] = []
  const sleeps: number[] = []
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = new URL(String(input))
    calls.push(`${url.pathname}?${url.searchParams}`)
    clock += opts.advancePerRequest ?? 0
    const reply = route(url) ?? { status: 404, body: { code: 404 } }
    if (reply === 'network-error') throw new TypeError('fetch failed')
    const headers = new Headers()
    if (reply.retryAfter !== undefined) headers.set('retry-after', reply.retryAfter)
    return new Response(JSON.stringify(reply.body ?? null), { status: reply.status, headers })
  })
  const service = new LyricsService({
    fetch: fetchMock as unknown as typeof fetch,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms)
      clock += ms
    },
    cache: new LyricsCache(opts.backend ?? null, () => clock)
  })
  return { service, calls, sleeps, fetchMock, advance: (ms: number) => (clock += ms) }
}

const isGet = (url: URL): boolean => url.pathname === '/api/get'
const isSearch = (url: URL): boolean => url.pathname === '/api/search'

describe('LyricsService lookups', () => {
  it('honours Retry-After on a 503 and keeps going instead of reporting no lyrics', async () => {
    let first = true
    const h = harness((url) => {
      if (!isGet(url)) return undefined
      if (first) {
        first = false
        return { status: 503, retryAfter: '1' }
      }
      return { status: 200, body: record() }
    })
    const result = await h.service.getLyrics(request)
    expect(result.status).toBe('synced')
    expect(h.sleeps).toEqual([1000])
    // The same request was asked again, not skipped.
    expect(h.calls[0]).toBe(h.calls[1])
  })

  it('reports "unavailable" when the library keeps refusing, and does not remember it', async () => {
    const h = harness(() => ({ status: 503, retryAfter: '1' }))
    const result = await h.service.getLyrics(request)
    expect(result.status).toBe('unavailable')
    // One refused step is retried past (LRCLIB throttles some requests while answering the
    // next); two refused steps in a row end the lookup: no hammering of every fallback.
    expect(new Set(h.calls).size).toBe(2)
    expect(h.calls.length).toBe(10)

    const callsBefore = h.calls.length
    await h.service.getLyrics(request)
    expect(h.calls.length).toBeGreaterThan(callsBefore)
  })

  it('treats a network failure as unavailable, not as a missing song', async () => {
    const h = harness(() => 'network-error')
    expect((await h.service.getLyrics(request)).status).toBe('unavailable')
    // One quick second try, then it stops: no network means no point trying the rest.
    expect(h.calls.length).toBe(2)
  })

  it('keeps going when one step is throttled and finds the lyrics in the next', async () => {
    // The exact lookup with the album keeps getting 429; the next one is answered.
    const h = harness((url) => (isGet(url) && url.searchParams.has('album_name') ? { status: 429, retryAfter: '1' } : isGet(url) ? { status: 200, body: record() } : undefined))
    const result = await h.service.getLyrics(request)
    expect(result.status).toBe('synced')
  })

  it('stays away for as long as a long Retry-After asks', async () => {
    const h = harness(() => ({ status: 429, retryAfter: '60' }))
    expect((await h.service.getLyrics(request)).status).toBe('unavailable')
    const after = h.calls.length
    expect((await h.service.getLyrics({ ...request, title: 'Other Song' })).status).toBe('unavailable')
    expect(h.calls.length).toBe(after)
    h.advance(61_000)
    await h.service.getLyrics({ ...request, title: 'Third Song' })
    expect(h.calls.length).toBeGreaterThan(after)
  })

  it('keeps looking when the exact match is wrongly marked instrumental', async () => {
    const h = harness((url) => {
      if (isGet(url))
        return { status: 200, body: record({ instrumental: true, syncedLyrics: null, plainLyrics: null }) }
      if (isSearch(url)) return { status: 200, body: [record()] }
      return undefined
    })
    const result = await h.service.getLyrics(request)
    expect(result.status).toBe('synced')
    expect(result.syncedLyrics).toBe(TIMED)
  })

  it('believes an instrumental when nothing with words exists', async () => {
    const h = harness((url) => {
      if (isGet(url))
        return { status: 200, body: record({ instrumental: true, syncedLyrics: null, plainLyrics: null }) }
      if (isSearch(url)) return { status: 200, body: [] }
      return undefined
    })
    expect((await h.service.getLyrics(request)).status).toBe('instrumental')
  })

  it('prefers timed lyrics found by search over an untimed exact match', async () => {
    const h = harness((url) => {
      if (isGet(url)) return { status: 200, body: record({ syncedLyrics: null }) }
      if (isSearch(url)) return { status: 200, body: [record({ duration: 215 })] }
      return undefined
    })
    expect((await h.service.getLyrics(request)).status).toBe('synced')
  })

  it('matches any credited artist when the player lists several', async () => {
    const h = harness((url) => {
      if (isSearch(url)) return { status: 200, body: [record({ artistName: 'Odile Marchand' })] }
      return undefined
    })
    const result = await h.service.getLyrics({ ...request, artist: 'The Quiet Hours, Odile Marchand' })
    expect(result.status).toBe('synced')
  })

  it('does not match on a shared "The"', async () => {
    const h = harness((url) => {
      if (isSearch(url)) return { status: 200, body: [record({ artistName: 'The Other Band' })] }
      return undefined
    })
    expect((await h.service.getLyrics(request)).status).toBe('not-found')
  })

  it('remembers a definite miss for a while, unless asked to search again', async () => {
    const h = harness(() => undefined)
    expect((await h.service.getLyrics(request)).status).toBe('not-found')
    const after = h.calls.length
    expect((await h.service.getLyrics(request)).status).toBe('not-found')
    expect(h.calls.length).toBe(after)
    await h.service.getLyrics({ ...request, force: true })
    expect(h.calls.length).toBeGreaterThan(after)
  })

  it('shares one lookup between two windows asking at once', async () => {
    const h = harness((url) => (isGet(url) ? { status: 200, body: record() } : undefined))
    const [a, b] = await Promise.all([h.service.getLyrics(request), h.service.getLyrics(request)])
    expect(a).toBe(b)
    expect(h.calls.length).toBe(1)
  })

  it('does not reuse a decision made for a different length of the same title', async () => {
    const h = harness((url) => {
      if (!isGet(url)) return undefined
      return url.searchParams.get('duration') === '201'
        ? { status: 200, body: record({ duration: 201 }) }
        : undefined
    })
    expect((await h.service.getLyrics({ ...request, duration: 201 })).status).toBe('synced')
    // 205 fell in the same ten-second bucket before; it is a different recording here.
    const other = await h.service.getLyrics({ ...request, duration: 205 })
    expect(other.status).toBe('not-found')
  })

  it('gives up at the overall deadline instead of running every fallback', async () => {
    const h = harness(() => ({ status: 404 }), { advancePerRequest: 7_000 })
    const result = await h.service.getLyrics(request)
    expect(result.status).toBe('unavailable')
    expect(h.calls.length).toBeLessThanOrEqual(3)
  })

  it('keeps found lyrics across a restart', async () => {
    let stored: string | null = null
    const backend: LyricsCacheBackend = { read: () => stored, write: (d) => (stored = d) }
    const first = harness((url) => (isGet(url) ? { status: 200, body: record() } : undefined), { backend })
    await first.service.getLyrics(request)
    first.service.flush()
    expect(stored).not.toBeNull()

    const second = harness(() => 'network-error', { backend })
    const result = await second.service.getLyrics(request)
    expect(result.status).toBe('synced')
    expect(second.calls.length).toBe(0)
  })

  it('does not write misses or failures to disk', async () => {
    let stored: string | null = null
    const backend: LyricsCacheBackend = { read: () => stored, write: (d) => (stored = d) }
    const h = harness(() => 'network-error', { backend })
    await h.service.getLyrics(request)
    h.service.flush()
    expect(stored === null ? {} : JSON.parse(stored).entries).toEqual({})
  })

  it('only borrows a length from iTunes for the same song', async () => {
    const h = harness((url) => {
      if (url.hostname === 'itunes.apple.com') {
        return {
          status: 200,
          body: {
            results: [
              { trackName: 'A Different Song', artistName: 'The Quiet Hours', trackTimeMillis: 100_000 },
              { trackName: 'Paper Lanterns', artistName: 'The Quiet Hours', trackTimeMillis: 214_000 }
            ]
          }
        }
      }
      if (isGet(url) && url.searchParams.get('duration') === '214') return { status: 200, body: record() }
      return undefined
    })
    const result = await h.service.getLyrics({ ...request, album: '', duration: 0 })
    expect(result.status).toBe('synced')
  })
})

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfter('2', 0)).toBe(2000)
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6_000)
    expect(parseRetryAfter(null, 0)).toBeUndefined()
    expect(parseRetryAfter('soon', 0)).toBeUndefined()
  })
})
