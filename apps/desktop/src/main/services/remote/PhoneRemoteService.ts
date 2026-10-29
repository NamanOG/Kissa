import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import type {
  PhoneRemoteStatus,
  RemoteChoice,
  RemoteCommand,
  RemoteLook,
  RemoteLyricLine,
  RemoteNowPlaying
} from '../../../types/remote'
import { isAllowedClient, isOwnHost, lanNetworks, type OwnNetwork } from './remoteNetwork'
import {
  PHONE_PAGE_CSS,
  PHONE_PAGE_HTML,
  PHONE_PAGE_ICON,
  PHONE_PAGE_JS,
  PHONE_MANIFEST,
  PHONE_ICONS
} from './phonePage'
import { boundQueue, EMPTY_QUEUE, type RemoteQueue } from '../../../types/remoteQueue'

/**
 * The phone remote: a small web page Kissa serves on the home network, so a phone that scans
 * the QR code can play, pause, skip and set the volume, and see what is playing.
 *
 * Safety, in order of the checks each request meets:
 * - Off until the listener switches it on, never remembered: every launch starts with it off.
 * - Only phones on the same network: a request must come from a home-range address or from
 *   this PC's own Wi-Fi or wired network; anything from further away is refused.
 * - The Host header must be this PC's own address, which stops web pages reaching it through
 *   a name they control (DNS rebinding). Cross-site requests are refused by Origin.
 * - Every control needs the session key, and the only way to get it is the six-digit code
 *   shown in Kissa. The QR code carries just the address, so a photo of it or the IP alone is
 *   not enough. Five wrong codes change the code and pause pairing for half a minute, which
 *   puts guessing out of reach. Switching the remote off forgets the key.
 * - The page loads nothing from anywhere else (a strict Content-Security-Policy).
 */
export const REMOTE_PORTS = [47330, 47331, 47332]
const CODE_ATTEMPTS = 5
const PAIR_LOCK_MS = 30_000
const MAX_BODY = 1024
const MAX_PHONES = 4
const MAX_ART_BYTES = 2_000_000
const MAX_LYRIC_LINES = 600
const HEARTBEAT_MS = 20_000
const MAX_CHOICES = 40
/** Sleep timer lengths a phone may choose, in minutes (0 switches it off). */
const SLEEP_MINUTES = [0, 15, 30, 60, 90]

export interface PhoneRemoteOptions {
  ports?: number[]
  /** This PC's networks; the first address is shown in the QR code. */
  networks?: () => OwnNetwork[]
  /** The interface to listen on (all of them by default; tests use 127.0.0.1). */
  listenHost?: string
  onCommand: (command: RemoteCommand) => void
  /** Sets the PC's volume (0 to 100). */
  onVolume: (level: number) => void
  /** Fetches a web cover (https only); bytes must be an image. Without it, web covers are skipped. */
  fetchArt?: (url: string) => Promise<{ type: string; bytes: Buffer } | null>
  /** The page's font files by name (sans.woff2, serif.woff2); the page falls back without them. */
  font?: (name: string) => Buffer | null
}

interface Phone {
  res: ServerResponse
}

const sha = (s: string): Buffer => createHash('sha256').update(s).digest()

/** A copy of the snapshot with every field bounded, so the window cannot hand the phone junk. */
export function boundNowPlaying(value: unknown): RemoteNowPlaying | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '')
  const seconds = (x: unknown): number =>
    typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(x, 86_400) : 0
  const art = typeof v.artworkDataUrl === 'string' ? v.artworkDataUrl : ''
  const accent =
    typeof v.accent === 'string' && /^#[0-9a-f]{6}$/i.test(v.accent) ? v.accent : undefined
  return {
    title: text(v.title, 200),
    artist: text(v.artist, 200),
    album: text(v.album, 200),
    isPlaying: v.isPlaying === true,
    progress: seconds(v.progress),
    duration: seconds(v.duration),
    accent,
    artworkDataUrl: /^data:image\/(jpeg|png|webp|gif);base64,/.test(art) ? art : undefined,
    artworkRemoteUrl:
      typeof v.artworkRemoteUrl === 'string' && /^https:\/\/[^\s]{1,1000}$/.test(v.artworkRemoteUrl)
        ? v.artworkRemoteUrl
        : undefined,
    canSkip: v.canSkip !== false
  }
}

/** A copy of the room's look with every field bounded; null when it is not a look at all. */
export function boundLook(value: unknown): RemoteLook | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '')
  const choices = (x: unknown): RemoteChoice[] =>
    Array.isArray(x)
      ? x
          .slice(0, MAX_CHOICES)
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map((c) => ({
            id: text(c.id, 60),
            name: text(c.name, 80),
            // A CSS background for a sample; never a url(), which the page could not load anyway.
            ...(typeof c.swatch === 'string' &&
            c.swatch.length <= 600 &&
            !/url\s*\(/i.test(c.swatch)
              ? { swatch: c.swatch }
              : {})
          }))
          .filter((c) => c.id)
      : []
  const light = typeof v.light === 'number' && Number.isFinite(v.light) ? v.light : 0
  const left = v.sleepLeft
  return {
    lang: text(v.lang, 10),
    room: text(v.room, 60),
    rooms: choices(v.rooms),
    pressing: text(v.pressing, 60),
    pressings: choices(v.pressings),
    finish: text(v.finish, 60),
    finishes: choices(v.finishes),
    light: Math.max(0, Math.min(100, Math.round(light))),
    lyrics: v.lyrics === true,
    sleepLeft:
      typeof left === 'number' && Number.isFinite(left) && left >= 0 ? Math.min(left, 86_400) : null
  }
}

export function boundLyrics(value: unknown): RemoteLyricLine[] {
  if (!Array.isArray(value)) return []
  const out: RemoteLyricLine[] = []
  for (const line of value.slice(0, MAX_LYRIC_LINES)) {
    if (!line || typeof line !== 'object') continue
    const { time, text } = line as { time?: unknown; text?: unknown }
    if (typeof time !== 'number' || !Number.isFinite(time) || typeof text !== 'string') continue
    out.push({ time: Math.max(0, time), text: text.slice(0, 300) })
  }
  return out
}

function decodeArt(
  dataUrl: string | undefined
): { type: string; bytes: Buffer; tag: string } | null {
  if (!dataUrl) return null
  const comma = dataUrl.indexOf(',')
  const type = dataUrl.slice(5, dataUrl.indexOf(';'))
  const bytes = Buffer.from(dataUrl.slice(comma + 1), 'base64')
  if (!bytes.length || bytes.length > MAX_ART_BYTES) return null
  return { type, bytes, tag: createHash('sha1').update(bytes).digest('hex').slice(0, 16) }
}

export class PhoneRemoteService {
  private server: Server | null = null
  private port: number | null = null
  private addresses: string[] = []
  private networks: OwnNetwork[] = []
  private key: string | null = null
  private keyHash: Buffer | null = null
  private code: { value: string; attempts: number } | null = null
  private pairLockedUntil = 0
  private problem: PhoneRemoteStatus['problem']
  private publicNetwork = false
  private readonly phones = new Set<Phone>()
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private nowPlaying: RemoteNowPlaying | null = null
  private art: { type: string; bytes: Buffer; tag: string } | null = null
  private lyrics: RemoteLyricLine[] = []
  private queue: RemoteQueue = EMPTY_QUEUE
  private look: RemoteLook | null = null
  private lyricsFor = ''
  private volume: number | null = null
  private snapshotAt = Date.now()
  private readonly statusListeners = new Set<(status: PhoneRemoteStatus) => void>()

  constructor(private readonly options: PhoneRemoteOptions) {}

  public async start(): Promise<PhoneRemoteStatus> {
    if (this.server) return this.getStatus()
    this.networks = (this.options.networks ?? lanNetworks)()
    this.addresses = this.networks.map((n) => n.address)
    if (!this.addresses.length) {
      this.problem = 'no-network'
      this.emitStatus()
      return this.getStatus()
    }
    for (const port of this.options.ports ?? REMOTE_PORTS) {
      const server = createServer((req, res) => void this.handle(req, res))
      const ok = await new Promise<boolean>((resolve) => {
        server.once('error', () => resolve(false))
        server.listen(port, this.options.listenHost ?? '0.0.0.0', () => resolve(true))
      })
      if (ok) {
        // A phone that reaches the page but never finishes a request must not hold a socket.
        server.headersTimeout = 10_000
        server.requestTimeout = 15_000
        this.server = server
        const address = server.address()
        this.port = typeof address === 'object' && address ? address.port : port
        this.key = randomBytes(24).toString('base64url')
        this.keyHash = sha(this.key)
        this.newCode()
        this.problem = undefined
        this.heartbeat = setInterval(() => this.broadcast(': beat\n\n'), HEARTBEAT_MS)
        this.heartbeat.unref?.()
        this.emitStatus()
        return this.getStatus()
      }
      server.close()
    }
    this.problem = 'no-port'
    this.emitStatus()
    return this.getStatus()
  }

  public stop(): PhoneRemoteStatus {
    for (const phone of this.phones) phone.res.end()
    this.phones.clear()
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = null
    this.server?.closeAllConnections?.()
    this.server?.close()
    this.server = null
    this.port = null
    this.key = null
    this.keyHash = null
    this.code = null
    this.queue = EMPTY_QUEUE
    this.look = null
    this.problem = undefined
    this.emitStatus()
    return this.getStatus()
  }

  public getStatus(): PhoneRemoteStatus {
    const url = this.port && this.addresses[0] ? `http://${this.addresses[0]}:${this.port}` : null
    return {
      on: this.server !== null,
      url,
      pairUrl: url && this.key ? `${url}/` : null,
      code: this.code?.value ?? null,
      phones: this.phones.size,
      ...(this.problem && { problem: this.problem }),
      ...(this.server && this.publicNetwork && { publicNetwork: true })
    }
  }

  /** Records whether Windows calls this network Public (the card then says how to fix it). */
  public setPublicNetwork(value: boolean): void {
    if (value === this.publicNetwork) return
    this.publicNetwork = value
    this.emitStatus()
  }

  public onStatus(listener: (status: PhoneRemoteStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  public hasPhones(): boolean {
    return this.phones.size > 0
  }

  public setNowPlaying(value: unknown): void {
    const next = boundNowPlaying(value)
    if (!next) return
    const prev = this.nowPlaying
    const sameArt =
      next.artworkDataUrl === prev?.artworkDataUrl &&
      next.artworkRemoteUrl === prev?.artworkRemoteUrl
    if (!sameArt) {
      this.art = decodeArt(next.artworkDataUrl)
      const remote = next.artworkRemoteUrl
      if (!this.art && remote && this.options.fetchArt) {
        void this.options
          .fetchArt(remote)
          .then((got) => {
            if (!got || this.nowPlaying?.artworkRemoteUrl !== remote) return
            if (!/^image\/(jpeg|png|webp|gif)$/.test(got.type) || got.bytes.length > MAX_ART_BYTES)
              return
            const tag = createHash('sha1').update(got.bytes).digest('hex').slice(0, 16)
            this.art = { type: got.type, bytes: got.bytes, tag }
            this.broadcastEvent('state', this.statePayload())
          })
          .catch(() => undefined)
      }
    }
    this.nowPlaying = next
    this.snapshotAt = Date.now()
    const key = `${next.title}\u0000${next.artist}`
    if (key !== this.lyricsFor) {
      this.lyricsFor = key
      this.lyrics = []
    }
    this.broadcastEvent('state', this.statePayload())
  }

  /** The synced lines for the track now playing; the phone follows them against its clock. */
  public setLyrics(track: { title?: unknown; artist?: unknown }, lines: unknown): void {
    const key = `${typeof track.title === 'string' ? track.title.slice(0, 200) : ''}\u0000${typeof track.artist === 'string' ? track.artist.slice(0, 200) : ''}`
    if (key !== this.lyricsFor) return
    this.lyrics = boundLyrics(lines)
    this.broadcastEvent('lyrics', this.lyrics)
  }

  public setVolume(level: number | null): void {
    const next =
      level === null || !Number.isFinite(level)
        ? null
        : Math.max(0, Math.min(100, Math.round(level)))
    if (next === this.volume) return
    this.volume = next
    this.broadcastEvent('volume', { level: next })
  }

  public setLook(value: unknown): void {
    const next = boundLook(value)
    if (!next) return
    this.look = next
    this.broadcastEvent('look', next)
  }

  public setQueue(value: unknown): void {
    this.queue = boundQueue(value)
    this.broadcastEvent('queue', this.queue)
  }

  private statePayload(): Record<string, unknown> | null {
    const n = this.nowPlaying
    if (!n) return null
    const elapsed = n.isPlaying ? (Date.now() - this.snapshotAt) / 1000 : 0
    const progress =
      n.duration > 0 ? Math.min(n.duration, n.progress + elapsed) : n.progress + elapsed
    return {
      title: n.title,
      artist: n.artist,
      album: n.album,
      isPlaying: n.isPlaying,
      progress,
      duration: n.duration,
      accent: n.accent ?? null,
      art: this.art ? `/api/art?v=${this.art.tag}` : null,
      canSkip: n.canSkip !== false
    }
  }

  private newCode(): void {
    this.code = { value: String(randomInt(0, 1_000_000)).padStart(6, '0'), attempts: 0 }
  }

  private emitStatus(): void {
    const status = this.getStatus()
    for (const l of this.statusListeners) l(status)
  }

  private broadcast(chunk: string): void {
    for (const phone of this.phones) phone.res.write(chunk)
  }

  private broadcastEvent(name: string, data: unknown): void {
    if (this.phones.size) this.broadcast(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  private keyMatches(candidate: string | null | undefined): boolean {
    if (!candidate || !this.keyHash || candidate.length > 200) return false
    return timingSafeEqual(sha(candidate), this.keyHash)
  }

  /** A phone's change to the room, checked against the choices Kissa offered. */
  private lookCommand(setting: unknown, value: unknown): RemoteCommand | null {
    const look = this.look
    if (!look) return null
    const offered = (list: RemoteChoice[]): boolean =>
      typeof value === 'string' && list.some((c) => c.id === value)
    if (setting === 'room' && offered(look.rooms))
      return { action: 'look', setting, value: value as string }
    if (setting === 'pressing' && offered(look.pressings))
      return { action: 'look', setting, value: value as string }
    if (setting === 'finish' && offered(look.finishes))
      return { action: 'look', setting, value: value as string }
    if (setting === 'light' && typeof value === 'number' && Number.isFinite(value))
      return { action: 'look', setting, value: Math.max(0, Math.min(100, Math.round(value))) }
    if (setting === 'lyrics' && typeof value === 'boolean')
      return { action: 'look', setting, value }
    if (setting === 'sleep' && typeof value === 'number' && SLEEP_MINUTES.includes(value))
      return { action: 'look', setting, value }
    return null
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const security = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin'
    }
    const send = (status: number, body?: unknown): void => {
      res.writeHead(status, { ...security, 'Content-Type': 'application/json' })
      res.end(body === undefined ? '' : JSON.stringify(body))
    }
    const port = this.port
    if (!port || !isAllowedClient(req.socket.remoteAddress, this.networks)) return send(403)
    if (!isOwnHost(req.headers.host, port, this.addresses)) return send(421)
    const origin = req.headers.origin
    if (origin !== undefined && origin !== `http://${req.headers.host}`) return send(403)

    const url = new URL(req.url ?? '/', 'http://kissa.local')
    const path = url.pathname

    if (req.method === 'GET') {
      const page = (type: string, body: string): void => {
        res.writeHead(200, {
          ...security,
          'Content-Type': type,
          'Content-Security-Policy':
            "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        })
        res.end(body)
      }
      if (path === '/') return page('text/html; charset=utf-8', PHONE_PAGE_HTML)
      if (path === '/app.js') return page('text/javascript; charset=utf-8', PHONE_PAGE_JS)
      if (path === '/app.css') return page('text/css; charset=utf-8', PHONE_PAGE_CSS)
      if (path === '/icon.svg') return page('image/svg+xml', PHONE_PAGE_ICON)
      if (path === '/manifest.webmanifest') return page('application/manifest+json', PHONE_MANIFEST)
      if (Object.hasOwn(PHONE_ICONS, path)) {
        res.writeHead(200, { ...security, 'Content-Type': 'image/png' })
        return void res.end(PHONE_ICONS[path])
      }
      if (path.startsWith('/font/')) {
        const font = this.options.font?.(path.slice(6)) ?? null
        if (!font) return send(404)
        res.writeHead(200, {
          ...security,
          'Content-Type': 'font/woff2',
          'Cache-Control': 'public, max-age=604800'
        })
        return void res.end(font)
      }
      if (path === '/api/art') {
        if (!this.keyMatches(url.searchParams.get('k'))) return send(401)
        if (!this.art) return send(404)
        res.writeHead(200, {
          ...security,
          'Content-Type': this.art.type,
          'Cache-Control': 'private, max-age=86400'
        })
        return void res.end(this.art.bytes)
      }
      if (path === '/api/events') {
        if (!this.keyMatches(url.searchParams.get('k'))) return send(401)
        if (this.phones.size >= MAX_PHONES) return send(429)
        res.writeHead(200, {
          ...security,
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive'
        })
        res.write('retry: 2000\n\n')
        const phone: Phone = { res }
        this.phones.add(phone)
        req.socket.setKeepAlive(true)
        req.on('close', () => {
          this.phones.delete(phone)
          this.emitStatus()
        })
        res.write(`event: state\ndata: ${JSON.stringify(this.statePayload())}\n\n`)
        res.write(`event: lyrics\ndata: ${JSON.stringify(this.lyrics)}\n\n`)
        res.write(`event: volume\ndata: ${JSON.stringify({ level: this.volume })}\n\n`)
        res.write(`event: queue\ndata: ${JSON.stringify(this.queue)}\n\n`)
        if (this.look) res.write(`event: look\ndata: ${JSON.stringify(this.look)}\n\n`)
        this.emitStatus()
        return
      }
      return send(404)
    }

    if (req.method !== 'POST') return send(405)
    // A JSON body needs a CORS preflight from any other site, and none is ever granted.
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415)
    let body: Record<string, unknown>
    try {
      const parsed = JSON.parse(await readBody(req)) as unknown
      body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return send(400)
    }

    if (path === '/api/pair') {
      const code = this.code
      if (!code || !this.key) return send(409)
      if (Date.now() < this.pairLockedUntil) return send(429, { error: 'wait' })
      if (typeof body.code !== 'string' || body.code !== code.value) {
        code.attempts++
        if (code.attempts >= CODE_ATTEMPTS) {
          this.newCode()
          this.pairLockedUntil = Date.now() + PAIR_LOCK_MS
        }
        this.emitStatus()
        return send(401, { error: 'wrong-code' })
      }
      return send(200, { key: this.key })
    }

    if (path === '/api/command') {
      const header = req.headers.authorization ?? ''
      if (!this.keyMatches(header.startsWith('Bearer ') ? header.slice(7) : null)) return send(401)
      const action = body.action
      if (action === 'playIndex') {
        const { index, revision } = body
        if (
          typeof index !== 'number' ||
          !Number.isSafeInteger(index) ||
          index < 0 ||
          typeof revision !== 'string' ||
          !revision ||
          revision.length > 200
        )
          return send(422)
        if (revision !== this.queue.revision) return send(409, { error: 'queue-changed' })
        if (
          (this.queue.kind !== 'album' && this.queue.kind !== 'queue') ||
          !this.queue.rows.some((row) => row.index === index && row.playable)
        )
          return send(422)
        this.options.onCommand({ action, index, revision })
        return send(204)
      }
      if (action === 'playPause' || action === 'next' || action === 'prev') {
        this.options.onCommand({ action })
        return send(204)
      }
      if (action === 'look') {
        const command = this.lookCommand(body.setting, body.value)
        if (!command) return send(422)
        this.options.onCommand(command)
        return send(204)
      }
      if (action === 'volume') {
        const level = body.level
        if (typeof level !== 'number' || !Number.isFinite(level)) return send(422)
        const clamped = Math.max(0, Math.min(100, Math.round(level)))
        this.options.onVolume(clamped)
        this.setVolume(clamped)
        return send(204)
      }
      return send(422)
    }

    return send(404)
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
