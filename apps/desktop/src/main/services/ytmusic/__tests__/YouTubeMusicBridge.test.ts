import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from 'http'
import { STATE_TTL_MS, YouTubeMusicBridge } from '../YouTubeMusicBridge'
import { isAllowedOrigin, parseYouTubeMusicState } from '../youtubeMusicState'

const EXT = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

function call(
  port: number,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body)
    const req = request(
      { host: '127.0.0.1', port, method, path, headers: { Origin: EXT, ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } },
      (res) => {
        let text = ''
        res.on('data', (c) => (text += c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : null }))
      }
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

const playing = { v: 1, ad: false, title: 'Pink + White', artist: 'Frank Ocean', album: 'Blonde', artworkUrl: 'https://lh3.googleusercontent.com/abc=w544-h544', playing: true, position: 12, duration: 184 }

describe('youtubeMusicState', () => {
  it('accepts a well-formed report and refuses ads and junk', () => {
    expect(parseYouTubeMusicState(playing, 1000)).toMatchObject({ title: 'Pink + White', isPlaying: true, receivedAt: 1000 })
    expect(parseYouTubeMusicState({ ...playing, ad: true }, 1)).toBeNull()
    expect(parseYouTubeMusicState({ ...playing, title: '' }, 1)).toBeNull()
    expect(parseYouTubeMusicState({ ...playing, v: 2 }, 1)).toBeNull()
    expect(parseYouTubeMusicState({ ...playing, position: Number.NaN }, 1)).toBeNull()
    expect(parseYouTubeMusicState('nope', 1)).toBeNull()
  })

  it('keeps the album cover YouTube Music actually serves (found in the live Discord check)', () => {
    const live = 'https://yt3.googleusercontent.com/BJS73TPvpRmmiHnZDbrnLSHDwcIjB4VgqAqQuVabTyv7Ppp8FoJm1SVv=w544-h544'
    expect(parseYouTubeMusicState({ ...playing, artworkUrl: live }, 1)?.artworkUrl).toBe(live)
  })

  it('keeps only covers from YouTube Music image hosts, and trims text', () => {
    expect(parseYouTubeMusicState({ ...playing, artworkUrl: 'https://evil.example/x.png' }, 1)?.artworkUrl).toBeUndefined()
    expect(parseYouTubeMusicState({ ...playing, artworkUrl: 'http://lh3.googleusercontent.com/a' }, 1)?.artworkUrl).toBeUndefined()
    expect(parseYouTubeMusicState({ ...playing, title: 'x'.repeat(500) }, 1)?.title).toHaveLength(200)
  })

  it('refuses every web page, and accepts extension or missing origins', () => {
    expect(isAllowedOrigin(EXT)).toBe(true)
    expect(isAllowedOrigin('extension://abcdefghijklmnopabcdefghijklmnop')).toBe(true)
    // Chrome sends no Origin for an extension's request to a host it has permission for.
    expect(isAllowedOrigin(undefined)).toBe(true)
    expect(isAllowedOrigin('https://music.youtube.com')).toBe(false)
    expect(isAllowedOrigin('http://localhost:3000')).toBe(false)
    expect(isAllowedOrigin('null')).toBe(false)
    expect(isAllowedOrigin('chrome-extension://not-an-id')).toBe(false)
  })
})

describe('YouTubeMusicBridge', () => {
  let bridge: YouTubeMusicBridge
  let port: number
  let saved: string[] = []

  beforeEach(async () => {
    saved = []
    bridge = new YouTubeMusicBridge({ ports: [0], tokens: { load: () => saved, save: (h) => (saved = h) } })
    port = (await bridge.start())!
  })
  afterEach(() => bridge.stop())

  async function pairToken(): Promise<string> {
    const { pairing } = bridge.beginPairing()
    const res = await call(port, 'POST', '/v1/pair', { code: pairing!.code })
    return res.json.token
  }

  it('listens on loopback and answers extensions only', async () => {
    expect((await call(port, 'POST', '/v1/hello', {})).json).toEqual({ app: 'kissa', v: 1 })
    expect((await call(port, 'POST', '/v1/hello', {}, { Origin: 'https://music.youtube.com' })).status).toBe(403)
    // Only POST is answered, whatever the origin.
    expect((await call(port, 'GET', '/v1/hello', undefined, { Origin: '' })).status).toBe(405)
    expect((await call(port, 'GET', '/v1/hello')).status).toBe(405)
  })

  it('pairs only while Kissa shows a code, and stores just a hash', async () => {
    expect((await call(port, 'POST', '/v1/pair', { code: '123456' })).status).toBe(409)
    const token = await pairToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(saved).toHaveLength(1)
    expect(saved[0]).not.toBe(token)
    expect(bridge.getStatus()).toMatchObject({ paired: true, pairing: null })
  })

  it('stops accepting codes after five wrong ones', async () => {
    bridge.beginPairing()
    for (let i = 0; i < 5; i++) expect((await call(port, 'POST', '/v1/pair', { code: 'xxxxxx' })).status).toBe(401)
    expect(bridge.getStatus().pairing).toBeNull()
  })

  it('takes reports only from a paired connector, and refuses ads', async () => {
    const seen: unknown[] = []
    bridge.onState((s) => seen.push(s?.title ?? null))
    expect((await call(port, 'POST', '/v1/state', playing)).status).toBe(401)
    expect((await call(port, 'POST', '/v1/state', playing, { Authorization: `Bearer ${'0'.repeat(64)}` })).status).toBe(401)
    const token = await pairToken()
    const auth = { Authorization: `Bearer ${token}` }
    expect((await call(port, 'POST', '/v1/state', playing, auth)).status).toBe(204)
    expect(bridge.getState()?.title).toBe('Pink + White')
    // An ad clears the track rather than replacing it.
    expect((await call(port, 'POST', '/v1/state', { ...playing, ad: true }, auth)).status).toBe(422)
    expect(bridge.getState()).toBeNull()
    expect((await call(port, 'POST', '/v1/state', playing, auth)).status).toBe(204)
    expect((await call(port, 'POST', '/v1/state', { v: 1, gone: true }, auth)).status).toBe(204)
    expect(bridge.getState()).toBeNull()
    expect(seen).toEqual(['Pink + White', null, 'Pink + White', null])
  })

  it('forgets every connector on request', async () => {
    const token = await pairToken()
    bridge.forget()
    expect(saved).toEqual([])
    expect((await call(port, 'POST', '/v1/state', playing, { Authorization: `Bearer ${token}` })).status).toBe(401)
  })

  it('refuses oversized bodies and non-JSON content', async () => {
    const token = await pairToken()
    const auth = { Authorization: `Bearer ${token}` }
    const big = await call(port, 'POST', '/v1/state', { ...playing, padding: 'x'.repeat(10_000) }, auth).catch(() => ({ status: 0 }))
    expect([0, 400]).toContain(big.status)
    expect((await call(port, 'POST', '/v1/state', undefined, { ...auth, 'Content-Type': 'text/plain' })).status).toBe(415)
  })
})

describe('YouTubeMusicBridge expiry', () => {
  it('drops a track when the connector goes quiet', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let saved: string[] = []
    const bridge = new YouTubeMusicBridge({ ports: [0], tokens: { load: () => saved, save: (h) => (saved = h) } })
    try {
      const port = (await bridge.start())!
      const { pairing } = bridge.beginPairing()
      const { json } = await call(port, 'POST', '/v1/pair', { code: pairing!.code })
      await call(port, 'POST', '/v1/state', playing, { Authorization: `Bearer ${json.token}` })
      expect(bridge.getState()).not.toBeNull()
      vi.advanceTimersByTime(STATE_TTL_MS + 10)
      expect(bridge.getState()).toBeNull()
    } finally {
      bridge.stop()
      vi.useRealTimers()
    }
  })
})
