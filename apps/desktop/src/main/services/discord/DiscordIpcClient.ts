import { EventEmitter } from 'events'
import { createConnection, type Socket } from 'net'
import { randomUUID } from 'crypto'

/**
 * Minimal client for the Discord desktop app's local RPC pipe: handshake, SET_ACTIVITY,
 * ping/pong and close. That is all Rich Presence needs, so Kissa carries no RPC library
 * and no native SDK. The protocol: frames of [opcode u32 LE][length u32 LE][JSON].
 *
 * Only a public Application ID is sent. No user token is read, and no OAuth scope is
 * requested.
 */

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2
const OP_PING = 3
const OP_PONG = 4

const CONNECT_TIMEOUT_MS = 4_000
const RESPONSE_TIMEOUT_MS = 6_000

export type SocketFactory = (path: string) => Socket

export function encodeFrame(op: number, payload: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(payload), 'utf8')
  const header = Buffer.alloc(8)
  header.writeUInt32LE(op, 0)
  header.writeUInt32LE(json.length, 4)
  return Buffer.concat([header, json])
}

/** Splits a byte stream into frames. Keeps a partial frame for the next chunk. */
export class FrameDecoder {
  private buffer = Buffer.alloc(0)

  push(chunk: Buffer): Array<{ op: number; data: any }> {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const frames: Array<{ op: number; data: any }> = []
    while (this.buffer.length >= 8) {
      const op = this.buffer.readUInt32LE(0)
      const length = this.buffer.readUInt32LE(4)
      if (this.buffer.length < 8 + length) break
      const body = this.buffer.subarray(8, 8 + length).toString('utf8')
      this.buffer = this.buffer.subarray(8 + length)
      let data: any = null
      try {
        data = JSON.parse(body)
      } catch {
        data = null
      }
      frames.push({ op, data })
    }
    return frames
  }
}

export interface DiscordCommandError extends Error {
  code?: number
}

export class DiscordIpcClient extends EventEmitter {
  private socket: Socket | null = null
  private decoder = new FrameDecoder()
  private readonly pending = new Map<
    string,
    { resolve: (data: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >()
  private ready = false

  constructor(
    private readonly clientId: string,
    private readonly socketFactory: SocketFactory = (path) => createConnection(path)
  ) {
    super()
  }

  public get isReady(): boolean {
    return this.ready
  }

  /** Tries discord-ipc-0..9 (Stable, PTB and Canary each take the next free one). */
  public async connect(): Promise<void> {
    let lastError: unknown = null
    for (let i = 0; i < 10; i++) {
      try {
        await this.connectTo(`\\\\?\\pipe\\discord-ipc-${i}`)
        return
      } catch (err) {
        this.teardown()
        // No pipe with this number: try the next. Anything else came from a running
        // Discord (for example "Invalid Client ID") and is the real answer.
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err
        lastError = err
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Discord is not running')
  }

  public async setActivity(activity: Record<string, unknown> | null): Promise<unknown> {
    return this.command('SET_ACTIVITY', { pid: process.pid, activity: activity ?? undefined })
  }

  public close(): void {
    if (this.socket && this.ready) {
      try {
        this.socket.write(encodeFrame(OP_CLOSE, {}))
      } catch {
        // Already gone.
      }
    }
    this.teardown()
  }

  private connectTo(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.socketFactory(path)
      this.socket = socket
      this.decoder = new FrameDecoder()
      let settled = false

      const fail = (err: Error): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      }
      const timer = setTimeout(() => fail(new Error('Discord did not answer')), CONNECT_TIMEOUT_MS)

      socket.once('error', (err) => {
        if (!settled) fail(err)
      })
      socket.on('error', () => {
        // Reported through 'close'.
      })
      socket.on('close', () => {
        const wasReady = this.ready
        this.teardown()
        if (!settled) fail(new Error('Discord closed the connection'))
        else if (wasReady) this.emit('close')
      })
      socket.on('data', (chunk: Buffer) => {
        for (const frame of this.decoder.push(chunk)) {
          if (frame.op === OP_PING) {
            socket.write(encodeFrame(OP_PONG, frame.data))
          } else if (frame.op === OP_CLOSE) {
            if (!settled) fail(new Error(frame.data?.message || 'Discord refused the connection'))
            socket.destroy()
          } else if (frame.op === OP_FRAME) {
            if (frame.data?.evt === 'READY' && !settled) {
              settled = true
              clearTimeout(timer)
              this.ready = true
              resolve()
            } else {
              this.handleResponse(frame.data)
            }
          }
        }
      })
      socket.once('connect', () => {
        socket.write(encodeFrame(OP_HANDSHAKE, { v: 1, client_id: this.clientId }))
      })
    })
  }

  private command(cmd: string, args: Record<string, unknown>): Promise<unknown> {
    const socket = this.socket
    if (!socket || !this.ready) return Promise.reject(new Error('Not connected to Discord'))
    const nonce = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(nonce)
        reject(new Error(`Discord did not answer ${cmd}`))
      }, RESPONSE_TIMEOUT_MS)
      this.pending.set(nonce, { resolve, reject, timer })
      try {
        socket.write(encodeFrame(OP_FRAME, { cmd, args, nonce }))
      } catch (err) {
        clearTimeout(timer)
        this.pending.delete(nonce)
        reject(err as Error)
      }
    })
  }

  private handleResponse(data: any): void {
    const nonce = data?.nonce
    if (!nonce || !this.pending.has(nonce)) return
    const entry = this.pending.get(nonce)!
    this.pending.delete(nonce)
    clearTimeout(entry.timer)
    if (data.evt === 'ERROR') {
      const err: DiscordCommandError = new Error(data.data?.message || 'Discord rejected the request')
      err.code = data.data?.code
      entry.reject(err)
    } else {
      entry.resolve(data.data)
    }
  }

  private teardown(): void {
    this.ready = false
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer)
      entry.reject(new Error('Discord connection closed'))
    }
    this.pending.clear()
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.on('error', () => {})
      this.socket.destroy()
      this.socket = null
    }
  }
}
