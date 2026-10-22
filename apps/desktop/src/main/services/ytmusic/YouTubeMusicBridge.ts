import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import { isAllowedOrigin, parseYouTubeMusicState, type YouTubeMusicState } from './youtubeMusicState'

/**
 * The local end of the Kissa connector for YouTube Music.
 *
 * - Listens on 127.0.0.1 only, on the first free port of a short fixed list (the connector
 *   tries the same list).
 * - Refuses web pages: they always send their own http(s) Origin, which is rejected, and the
 *   JSON content type forces a CORS preflight that is never granted. Extensions send their own
 *   origin or none.
 * - A connector must be paired once with a six-digit code Kissa shows on request. Kissa
 *   keeps only a hash of the token it hands out; "Forget" revokes it.
 * - A track expires when the connector goes quiet (tab closed, browser quit, page left),
 *   so a stale song never stays on a Discord profile.
 */
export const BRIDGE_PORTS = [47321, 47322, 47323]
export const STATE_TTL_MS = 15_000
const PAIR_TTL_MS = 120_000
const PAIR_ATTEMPTS = 5
const MAX_BODY = 4096
const MAX_TOKENS = 3

export interface BridgeTokenStore {
  load(): string[]
  save(hashes: string[]): void
}

export interface BridgeStatus {
  listening: boolean
  paired: boolean
  /** A fresh, verified YouTube Music state is present. */
  connected: boolean
  pairing: { code: string; expiresAt: number } | null
}

export interface BridgeOptions {
  ports?: number[]
  tokens: BridgeTokenStore
  now?: () => number
}

const sha = (s: string): string => createHash('sha256').update(s).digest('hex')

export class YouTubeMusicBridge {
  private server: Server | null = null
  private port: number | null = null
  private tokenHashes: string[]
  private pairing: { code: string; expiresAt: number; attempts: number } | null = null
  private state: YouTubeMusicState | null = null
  private expiry: ReturnType<typeof setTimeout> | null = null
  private readonly stateListeners = new Set<(state: YouTubeMusicState | null) => void>()
  private readonly statusListeners = new Set<(status: BridgeStatus) => void>()
  private readonly now: () => number

  constructor(private readonly options: BridgeOptions) {
    this.now = options.now ?? Date.now
    this.tokenHashes = options.tokens.load().filter((h) => /^[0-9a-f]{64}$/.test(h)).slice(0, MAX_TOKENS)
  }

  public async start(): Promise<number | null> {
    if (this.server) return this.port
    for (const port of this.options.ports ?? BRIDGE_PORTS) {
      const server = createServer((req, res) => void this.handle(req, res))
      const ok = await new Promise<boolean>((resolve) => {
        server.once('error', () => resolve(false))
        server.listen(port, '127.0.0.1', () => resolve(true))
      })
      if (ok) {
        this.server = server
        const address = server.address()
        this.port = typeof address === 'object' && address ? address.port : port
        this.emitStatus()
        return this.port
      }
      server.close()
    }
    console.warn('[YouTubeMusicBridge] No free port; the connector cannot reach Kissa.')
    return null
  }

  public stop(): void {
    this.setState(null)
    this.server?.close()
    this.server = null
    this.port = null
  }

  public getPort(): number | null {
    return this.port
  }

  public getState(): YouTubeMusicState | null {
    return this.state
  }

  public getStatus(): BridgeStatus {
    const pairing = this.pairing && this.pairing.expiresAt > this.now() ? { code: this.pairing.code, expiresAt: this.pairing.expiresAt } : null
    return { listening: this.server !== null, paired: this.tokenHashes.length > 0, connected: this.state !== null, pairing }
  }

  public onState(listener: (state: YouTubeMusicState | null) => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  public onStatus(listener: (status: BridgeStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /** Shows a new six-digit code for pairing a connector. */
  public beginPairing(): BridgeStatus {
    this.pairing = { code: String(randomInt(0, 1_000_000)).padStart(6, '0'), expiresAt: this.now() + PAIR_TTL_MS, attempts: 0 }
    this.emitStatus()
    return this.getStatus()
  }

  public cancelPairing(): BridgeStatus {
    this.pairing = null
    this.emitStatus()
    return this.getStatus()
  }

  /** Revokes every paired connector. */
  public forget(): BridgeStatus {
    this.tokenHashes = []
    this.options.tokens.save([])
    this.setState(null)
    this.emitStatus()
    return this.getStatus()
  }

  private emitStatus(): void {
    const status = this.getStatus()
    for (const l of this.statusListeners) l(status)
  }

  private setState(state: YouTubeMusicState | null): void {
    if (this.expiry) clearTimeout(this.expiry)
    this.expiry = null
    const changed = (this.state === null) !== (state === null)
    this.state = state
    if (state) {
      this.expiry = setTimeout(() => this.setState(null), STATE_TTL_MS)
      this.expiry.unref?.()
    }
    for (const l of this.stateListeners) l(state)
    if (changed) this.emitStatus()
  }

  private authorised(req: IncomingMessage): boolean {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!/^[0-9a-f]{64}$/.test(token)) return false
    const hash = Buffer.from(sha(token), 'hex')
    return this.tokenHashes.some((h) => timingSafeEqual(Buffer.from(h, 'hex'), hash))
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const send = (status: number, body?: unknown): void => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(body === undefined ? '' : JSON.stringify(body))
    }
    if (!isAllowedOrigin(req.headers.origin)) return send(403)
    const url = req.url ?? ''

    if (req.method !== 'POST') return send(405)
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415)

    let body: unknown
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return send(400)
    }

    // Discovery is a POST too: Chrome sends an extension's Origin only on requests like this.
    if (url === '/v1/hello') return send(200, { app: 'kissa', v: 1 })

    if (url === '/v1/pair') {
      const p = this.pairing
      if (!p || p.expiresAt <= this.now()) return send(409, { error: 'not-pairing' })
      const code = (body as { code?: unknown })?.code
      if (typeof code !== 'string' || code !== p.code) {
        p.attempts++
        if (p.attempts >= PAIR_ATTEMPTS) this.pairing = null
        this.emitStatus()
        return send(401, { error: 'wrong-code' })
      }
      const token = randomBytes(32).toString('hex')
      this.tokenHashes = [sha(token), ...this.tokenHashes].slice(0, MAX_TOKENS)
      this.options.tokens.save(this.tokenHashes)
      this.pairing = null
      this.emitStatus()
      return send(200, { token })
    }

    if (url === '/v1/state') {
      if (!this.authorised(req)) return send(401)
      if ((body as { gone?: unknown })?.gone === true) {
        this.setState(null)
        return send(204)
      }
      const state = parseYouTubeMusicState(body, this.now())
      // Ads and malformed reports clear rather than linger.
      this.setState(state)
      return send(state ? 204 : 422)
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
