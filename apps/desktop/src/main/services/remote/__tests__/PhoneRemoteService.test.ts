import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from 'http'
import { PhoneRemoteService, boundNowPlaying } from '../PhoneRemoteService'
import { isAllowedClient, isLocalNetworkAddress, isOwnHost, lanAddresses } from '../remoteNetwork'
import type { RemoteCommand } from '../../../../types/remote'
import { boundQueue } from '../../../../types/remoteQueue'

const services: PhoneRemoteService[] = []

async function startRemote(): Promise<{
  service: PhoneRemoteService
  base: string
  key: string
  commands: RemoteCommand[]
  volumes: number[]
}> {
  const commands: RemoteCommand[] = []
  const volumes: number[] = []
  const service = new PhoneRemoteService({
    ports: [0],
    listenHost: '127.0.0.1',
    networks: () => [{ address: '127.0.0.1', netmask: '255.0.0.0' }],
    onCommand: (c) => commands.push(c),
    onVolume: (v) => volumes.push(v),
    font: (name) => (name === 'sans.woff2' ? Buffer.from('font') : null)
  })
  services.push(service)
  const status = await service.start()
  const key = await pairKey(status.url!, status.code!)
  return { service, base: status.url!, key, commands, volumes }
}

/** Pairs the way a phone does: by typing the code. */
async function pairKey(base: string, code: string): Promise<string> {
  const res = await fetch(`${base}/api/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
  return ((await res.json()) as { key: string }).key
}

/** A raw request, for headers fetch will not let a test set (Host). */
function raw(base: string, path: string, headers: Record<string, string>): Promise<number> {
  const url = new URL(base)
  return new Promise((resolve, reject) => {
    const req = request({ host: url.hostname, port: url.port, path, headers }, (res) => {
      res.resume()
      resolve(res.statusCode ?? 0)
    })
    req.on('error', reject)
    req.end()
  })
}

const command = (
  base: string,
  key: string | null,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> =>
  fetch(`${base}/api/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key && { Authorization: `Bearer ${key}` }),
      ...headers
    },
    body: JSON.stringify(body)
  })

afterEach(() => {
  for (const s of services.splice(0)) s.stop()
})

describe('remote network rules', () => {
  it('accepts home-network addresses and refuses public ones', () => {
    for (const a of [
      '192.168.1.20',
      '10.0.0.5',
      '172.16.4.1',
      '172.31.255.1',
      '127.0.0.1',
      '::1',
      '::ffff:192.168.0.9',
      'fe80::1',
      'fd12::3'
    ]) {
      expect(isLocalNetworkAddress(a), a).toBe(true)
    }
    for (const a of [
      '8.8.8.8',
      '172.32.0.1',
      '100.64.0.1',
      '2001:db8::1',
      '::ffff:1.1.1.1',
      '',
      undefined
    ]) {
      expect(isLocalNetworkAddress(a), String(a)).toBe(false)
    }
  })

  it('lets in phones on the PC’s own network, even an unusual range like 172.10', () => {
    const own = [{ address: '172.10.9.250', netmask: '255.255.255.0' }]
    expect(isAllowedClient('172.10.9.31', own)).toBe(true)
    expect(isAllowedClient('::ffff:172.10.9.31', own)).toBe(true)
    expect(isAllowedClient('172.10.8.31', own)).toBe(false)
    expect(isAllowedClient('8.8.8.8', own)).toBe(false)
    // A network wider than /8 is never treated as home.
    expect(isAllowedClient('9.9.9.9', [{ address: '8.8.8.8', netmask: '128.0.0.0' }])).toBe(false)
  })

  it('only takes this PC as the host, so rebinding a web name to it fails', () => {
    expect(isOwnHost('192.168.1.20:47330', 47330, ['192.168.1.20'])).toBe(true)
    expect(isOwnHost('evil.example:47330', 47330, ['192.168.1.20'])).toBe(false)
    expect(isOwnHost('192.168.1.20:80', 47330, ['192.168.1.20'])).toBe(false)
    expect(isOwnHost(undefined, 47330, ['192.168.1.20'])).toBe(false)
  })

  it('puts real Wi-Fi adapters before virtual ones', () => {
    const info = (address: string) => ({
      address,
      family: 'IPv4' as const,
      internal: false,
      netmask: '',
      mac: '',
      cidr: null
    })
    expect(
      lanAddresses({
        'vEthernet (WSL)': [info('172.20.0.1')],
        'Wi-Fi': [info('192.168.1.20')],
        Loopback: [{ ...info('127.0.0.1'), internal: true }],
        Ethernet: [info('172.10.9.250')]
      })
    ).toEqual(['192.168.1.20', '172.10.9.250', '172.20.0.1'])
  })
})

describe('PhoneRemoteService', () => {
  it('bounds queue metadata and never permits streaming rows to become commands', () => {
    const queue = boundQueue({
      kind: 'album-info',
      revision: 'x'.repeat(500),
      title: 'y'.repeat(500),
      total: Infinity,
      rows: Array.from({ length: 250 }, (_, index) => ({
        index,
        title: 't'.repeat(500),
        duration: Infinity,
        playable: true,
        audioUrl: 'file:///private'
      }))
    })
    expect(queue.rows).toHaveLength(200)
    expect(queue.revision).toHaveLength(200)
    expect(queue.title).toHaveLength(200)
    expect(
      queue.rows.every((row) => row.title.length === 200 && !row.playable && row.duration === 0)
    ).toBe(true)
    expect(JSON.stringify(queue)).not.toContain('private')
    expect(
      boundQueue({
        kind: 'queue',
        rows: [{ index: -1 }, { index: 0.5 }, { index: 0 }, { index: 0 }]
      }).rows
    ).toHaveLength(1)
    expect(boundQueue(null).kind).toBe('none')
  })

  it('sends the room look to phones, and accepts only the choices Kissa offered', async () => {
    const { service, base, key, commands } = await startRemote()
    expect(
      (await command(base, key, { action: 'look', setting: 'room', value: 'jazz-bar' })).status
    ).toBe(422)
    service.setLook({
      lang: 'es',
      room: 'quiet-room',
      rooms: [
        { id: 'quiet-room', name: 'Estudio de nogal', swatch: '#e08e45' },
        { id: 'jazz-bar', name: 'Club de jazz índigo', swatch: 'url(https://example.com/x.png)' }
      ],
      pressing: 'black',
      pressings: [{ id: 'black', name: 'Negro clásico' }],
      finish: 'original',
      finishes: [{ id: 'original', name: 'Original' }],
      light: 140,
      lyrics: true,
      sleepLeft: null
    })
    const res = await fetch(`${base}/api/events?k=${key}`)
    const reader = res.body!.getReader()
    let text = ''
    while (!text.includes('event: look'))
      text += new TextDecoder().decode((await reader.read()).value)
    await reader.cancel()
    expect(text).toContain('"lang":"es"')
    expect(text).toContain('"light":100')
    expect(text).not.toContain('example.com')

    expect(
      (await command(base, key, { action: 'look', setting: 'room', value: 'jazz-bar' })).status
    ).toBe(204)
    expect(
      (await command(base, key, { action: 'look', setting: 'room', value: 'attic' })).status
    ).toBe(422)
    expect(
      (await command(base, key, { action: 'look', setting: 'light', value: 250 })).status
    ).toBe(204)
    expect((await command(base, key, { action: 'look', setting: 'sleep', value: 7 })).status).toBe(
      422
    )
    expect((await command(base, key, { action: 'look', setting: 'sleep', value: 30 })).status).toBe(
      204
    )
    expect(
      (await command(base, key, { action: 'look', setting: 'lyrics', value: 'yes' })).status
    ).toBe(422)
    expect(
      (await command(base, key, { action: 'look', setting: 'theme', value: 'x' })).status
    ).toBe(422)
    expect(
      (await command(base, null, { action: 'look', setting: 'lyrics', value: false })).status
    ).toBe(401)
    expect(commands).toEqual([
      { action: 'look', setting: 'room', value: 'jazz-bar' },
      { action: 'look', setting: 'light', value: 100 },
      { action: 'look', setting: 'sleep', value: 30 }
    ])
  })

  it('validates playIndex, source, failed rows, stale revisions and authorization', async () => {
    const { service, base, key, commands } = await startRemote()
    const queue = {
      kind: 'album',
      revision: 'one',
      rows: [
        { index: 7, title: 'Seven', playable: true },
        { index: 8, title: 'Broken', playable: false }
      ]
    }
    service.setQueue(queue)
    const play = { action: 'playIndex', index: 7, revision: 'one' }
    expect((await command(base, null, play)).status).toBe(401)
    for (const index of [-1, 0.2, '7', null, 500, 8])
      expect((await command(base, key, { ...play, index })).status).toBe(422)
    expect((await command(base, key, { ...play, revision: 'old' })).status).toBe(409)
    expect((await command(base, key, { action: 'playIndex', index: 7 })).status).toBe(422)
    expect((await command(base, key, play)).status).toBe(204)
    expect(commands).toEqual([play])
    service.setQueue({ ...queue, kind: 'album-info' })
    expect((await command(base, key, play)).status).toBe(422)
  })

  it('sends the current queue on connect/reconnect and updates it over SSE', async () => {
    const { service, base, key } = await startRemote()
    service.setQueue({
      kind: 'queue',
      revision: 'one',
      rows: [{ index: 0, title: 'First', playable: true }]
    })
    for (let connect = 0; connect < 2; connect++) {
      const controller = new AbortController()
      const response = await fetch(`${base}/api/events?k=${key}`, { signal: controller.signal })
      const reader = response.body!.getReader()
      let text = ''
      while (!text.includes('event: queue'))
        text += new TextDecoder().decode((await reader.read()).value)
      expect(text).toContain(connect === 0 ? 'First' : 'Second')
      if (connect === 0) {
        service.setQueue({
          kind: 'queue',
          revision: 'two',
          rows: [{ index: 0, title: 'Second', playable: true }]
        })
        const update = new TextDecoder().decode((await reader.read()).value)
        expect(update).toContain('event: queue')
        expect(update).toContain('Second')
      }
      controller.abort()
    }
  })

  it('is off until started, and its QR code carries only the address, never the key', async () => {
    const idle = new PhoneRemoteService({ onCommand: vi.fn(), onVolume: vi.fn() })
    expect(idle.getStatus()).toMatchObject({ on: false, url: null, pairUrl: null, code: null })
    const { service, base, key } = await startRemote()
    const status = service.getStatus()
    expect(status.on).toBe(true)
    expect(status.pairUrl).toBe(`${base}/`)
    expect(status.pairUrl).not.toContain(key)
    expect(key.length).toBeGreaterThanOrEqual(30)
    expect(status.code).toMatch(/^\d{6}$/)
  })

  it('serves the page with a strict content policy', async () => {
    const { base } = await startRemote()
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(res.headers.get('content-security-policy')).toContain("script-src 'self'")
    expect(await res.text()).toContain('/app.js')
    expect((await fetch(`${base}/app.js`)).status).toBe(200)
    expect((await fetch(`${base}/font/sans.woff2`)).headers.get('content-type')).toBe('font/woff2')
    expect((await fetch(`${base}/font/nope.woff2`)).status).toBe(404)
  })

  it('runs commands only with the key', async () => {
    const { base, key, commands } = await startRemote()
    expect((await command(base, null, { action: 'next' })).status).toBe(401)
    expect((await command(base, 'x'.repeat(32), { action: 'next' })).status).toBe(401)
    expect((await command(base, key, { action: 'next' })).status).toBe(204)
    expect((await command(base, key, { action: 'playPause' })).status).toBe(204)
    expect((await command(base, key, { action: 'shutdown' })).status).toBe(422)
    expect(commands).toEqual([{ action: 'next' }, { action: 'playPause' }])
  })

  it('serves a standalone manifest and real PNG icons without pairing secrets or new CSP permissions', async () => {
    const { base, key } = await startRemote()
    const response = await fetch(`${base}/manifest.webmanifest`)
    expect(response.headers.get('content-type')).toBe('application/manifest+json')
    const manifest = await response.json()
    expect(manifest).toMatchObject({
      name: 'Kissa',
      start_url: '/',
      scope: '/',
      display: 'standalone'
    })
    expect(JSON.stringify(manifest)).not.toContain(key)
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
      '192x192',
      '512x512'
    ])
    for (const size of [180, 192, 512]) {
      const icon = await fetch(`${base}/icon-${size}.png`)
      const bytes = Buffer.from(await icon.arrayBuffer())
      expect(icon.headers.get('content-type')).toBe('image/png')
      expect(bytes.subarray(1, 4).toString()).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBe(size)
      expect(bytes.readUInt32BE(20)).toBe(size)
    }
    const html = await (await fetch(base)).text()
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(response.headers.get('content-security-policy')).toContain("manifest-src 'self'")
  })

  it('sets the volume within 0 to 100', async () => {
    const { base, key, volumes } = await startRemote()
    expect((await command(base, key, { action: 'volume', level: 140 })).status).toBe(204)
    expect((await command(base, key, { action: 'volume', level: 'loud' })).status).toBe(422)
    expect(volumes).toEqual([100])
  })

  it('refuses other websites and form posts', async () => {
    const { base, key, commands } = await startRemote()
    expect(
      (await command(base, key, { action: 'next' }, { Origin: 'https://evil.example' })).status
    ).toBe(403)
    const form = await fetch(`${base}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${key}` },
      body: '{"action":"next"}'
    })
    expect(form.status).toBe(415)
    const port = new URL(base).port
    expect(await raw(base, '/', { Host: `evil.example:${port}` })).toBe(421)
    expect(commands).toEqual([])
  })

  it('pairs with the code, and after five wrong tries changes it and pauses pairing', async () => {
    const { service, base, key } = await startRemote()
    const pair = (code: string): Promise<Response> =>
      fetch(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
    const first = service.getStatus().code!
    const right = await pair(first)
    expect(right.status).toBe(200)
    expect(await right.json()).toEqual({ key })

    const wrong = first === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) expect((await pair(wrong)).status).toBe(401)
    const next = service.getStatus().code!
    expect(next).not.toBe(first)
    expect((await pair(next)).status).toBe(429)
  })

  it('streams what is playing, and serves the cover only with the key', async () => {
    const { service, base, key } = await startRemote()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    service.setNowPlaying({
      title: 'So What',
      artist: 'Miles Davis',
      album: 'Kind of Blue',
      isPlaying: true,
      progress: 12,
      duration: 562,
      accent: '#c08040',
      artworkDataUrl: `data:image/png;base64,${png.toString('base64')}`
    })
    service.setLyrics({ title: 'So What', artist: 'Miles Davis' }, [{ time: 1, text: 'line' }])
    service.setVolume(42)

    const controller = new AbortController()
    const res = await fetch(`${base}/api/events?k=${key}`, { signal: controller.signal })
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const reader = res.body!.getReader()
    let text = ''
    while (!text.includes('event: volume'))
      text += new TextDecoder().decode((await reader.read()).value)
    expect(text).toContain('"title":"So What"')
    expect(text).toContain('"accent":"#c08040"')
    expect(text).toContain('"text":"line"')
    expect(text).toContain('"level":42')
    expect(service.getStatus().phones).toBe(1)

    const art = text.match(/"art":"([^"]+)"/)![1]
    expect((await fetch(`${base}${art}`)).status).toBe(401)
    const cover = await fetch(`${base}${art}&k=${key}`)
    expect(cover.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await cover.arrayBuffer())).toEqual(png)

    expect((await fetch(`${base}/api/events?k=wrong`)).status).toBe(401)
    controller.abort()
  })

  it('says when Windows calls the network Public, only while on', async () => {
    const { service } = await startRemote()
    service.setPublicNetwork(true)
    expect(service.getStatus().publicNetwork).toBe(true)
    service.stop()
    expect(service.getStatus().publicNetwork).toBeUndefined()
  })

  it('serves a web cover through Kissa itself', async () => {
    const fetchArt = vi.fn(async () => ({ type: 'image/jpeg', bytes: Buffer.from('jpegbytes') }))
    const service = new PhoneRemoteService({
      ports: [0],
      listenHost: '127.0.0.1',
      networks: () => [{ address: '127.0.0.1', netmask: '255.0.0.0' }],
      onCommand: vi.fn(),
      onVolume: vi.fn(),
      fetchArt
    })
    services.push(service)
    const status = await service.start()
    const key = await pairKey(status.url!, status.code!)
    service.setNowPlaying({
      title: 'A',
      artist: 'B',
      artworkRemoteUrl: 'https://example.com/a.jpg'
    })
    service.setNowPlaying({
      title: 'A',
      artist: 'B',
      artworkRemoteUrl: 'https://example.com/a.jpg',
      isPlaying: true
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchArt).toHaveBeenCalledTimes(1)
    const res = await fetch(`${status.url}/api/art?k=${key}`)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('jpegbytes')
    service.setNowPlaying({ title: 'C', artist: 'D', artworkRemoteUrl: 'http://example.com/a.jpg' })
    expect(fetchArt).toHaveBeenCalledTimes(1)
  })

  it('forgets the key when switched off', async () => {
    const { service, base, key } = await startRemote()
    service.stop()
    expect(service.getStatus()).toMatchObject({ on: false, pairUrl: null, code: null })
    await expect(command(base, key, { action: 'next' })).rejects.toThrow()
    const again = await service.start()
    expect(await pairKey(again.url!, again.code!)).not.toBe(key)
  })

  it('bounds what the window hands it', () => {
    const n = boundNowPlaying({
      title: 'x'.repeat(500),
      progress: -4,
      duration: Infinity,
      accent: 'red; background:url(x)',
      artworkDataUrl: 'data:text/html;base64,PHNjcmlwdD4='
    })!
    expect(n.title.length).toBe(200)
    expect(n.progress).toBe(0)
    expect(n.duration).toBe(0)
    expect(n.accent).toBeUndefined()
    expect(n.artworkDataUrl).toBeUndefined()
    expect(boundNowPlaying('nope')).toBeNull()
  })
})
