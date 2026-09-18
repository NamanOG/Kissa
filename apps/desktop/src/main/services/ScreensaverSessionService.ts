import * as net from 'net'
import * as crypto from 'crypto'
import * as os from 'os'
import { WindowManager } from '../window/WindowManager'
import { MediaDetectionService, type VideoPlaybackState } from './MediaDetectionService'

export function getScreensaverPipePath(): string {
  const username = (process.env.USERNAME || os.userInfo().username || 'default').toLowerCase()
  const hash = crypto.createHash('sha256').update(username).digest('hex').slice(0, 16)
  return `\\\\.\\pipe\\kissa-screensaver-${hash}`
}

export interface ActivationCheckResult {
  eligible: boolean
  reason?: string
}

export class ScreensaverSessionService {
  private static instance: ScreensaverSessionService
  private server: net.Server | null = null
  private activeClientSocket: net.Socket | null = null
  private sessionActive: boolean = false
  private sessionToken: string | null = null

  private constructor() {}

  public static getInstance(): ScreensaverSessionService {
    if (!ScreensaverSessionService.instance) {
      ScreensaverSessionService.instance = new ScreensaverSessionService()
    }
    return ScreensaverSessionService.instance
  }

  public isScreensaverActive(): boolean {
    return this.sessionActive
  }

  public getSessionToken(): string | null {
    return this.sessionToken
  }

  private static readonly ALLOWED_KISSA_PROCESSES = new Set(['kissa', 'electron'])
  private static readonly KNOWN_UNSAFE_PROCESSES = new Set([
    'vlc', 'vlc64', 'mpc-hc', 'mpc-hc64', 'mpc-be', 'mpc-be64',
    'potplayer', 'potplayermini', 'potplayermini64', 'kmplayer', 'kmplayer64',
    'gom', 'gom64', 'kodi', 'plex', 'plexmediaplayer', 'mpv', 'netflix',
    'zunevideo', 'movies', 'video.ui',
    'chrome', 'msedge', 'firefox', 'brave', 'opera', 'opera_gx',
    'vivaldi', 'arc', 'waterfox', 'librewolf', 'floorp', 'tor', 'chromium'
  ])

  public isForegroundProcessUnsafe(procName: string): boolean {
    const lower = procName.toLowerCase().trim()
    if (!lower || ScreensaverSessionService.ALLOWED_KISSA_PROCESSES.has(lower)) {
      return false
    }
    if (
      ScreensaverSessionService.KNOWN_UNSAFE_PROCESSES.has(lower) ||
      lower.startsWith('chrome') ||
      lower.startsWith('msedge') ||
      lower.startsWith('firefox') ||
      lower.startsWith('mpc-') ||
      lower.startsWith('potplayer')
    ) {
      return true
    }
    return false
  }

  public isActivationEligible(foregroundProcess?: string): ActivationCheckResult {
    // 1. Validate Kissa window exists and is valid
    const mainWindow = WindowManager.getInstance().getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { eligible: false, reason: 'window_unavailable' }
    }

    // 2. Validate current playback state (music must be actively playing)
    const mediaService = MediaDetectionService.getInstance()
    if (!mediaService.isMusicPlaying()) {
      return { eligible: false, reason: 'not_playing' }
    }

    // 3. Validate video state and helper freshness
    const videoState = mediaService.getVideoPlaybackState()
    if (videoState === 'detected') {
      return { eligible: false, reason: 'video_playback_active' }
    }
    if (videoState === 'unknown') {
      return { eligible: false, reason: 'media_state_unknown' }
    }

    // 4. Validate foreground application safety if reported by client
    if (foregroundProcess) {
      const proc = foregroundProcess.trim().toLowerCase()
      if (proc === 'unknown') {
        return { eligible: false, reason: 'foreground_process_unknown' }
      }
      if (this.isForegroundProcessUnsafe(proc)) {
        return { eligible: false, reason: 'foreground_video_or_browser' }
      }
    }

    return { eligible: true }
  }

  public start(): void {
    if (this.server) return

    const pipePath = getScreensaverPipePath()

    this.server = net.createServer((socket) => {
      this.handleClientSocket(socket)
    })

    this.server.on('error', (err: any) => {
      console.warn('[ScreensaverSessionService] Named pipe server error:', err?.message || err)
    })

    try {
      this.server.listen(pipePath, () => {
        console.log(`[ScreensaverSessionService] Named pipe listening on ${pipePath}`)
      })
    } catch (err) {
      console.warn('[ScreensaverSessionService] Failed to listen on named pipe:', err)
    }
  }

  private handleClientSocket(socket: net.Socket): void {
    let buffer = ''

    // 3000ms handshake timeout to reap abandoned or hung connections
    socket.setTimeout(3000, () => {
      if (socket !== this.activeClientSocket) {
        socket.destroy()
      }
    })

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8')
      let newlineIdx: number
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim()
        buffer = buffer.slice(newlineIdx + 1)
        if (line) {
          this.handleClientMessage(socket, line)
        }
      }
    })

    socket.on('close', () => {
      if (socket === this.activeClientSocket) {
        this.activeClientSocket = null
      }
    })

    socket.on('error', (err) => {
      console.warn('[ScreensaverSessionService] Socket error:', err?.message || err)
      socket.destroy()
    })
  }

  private handleClientMessage(socket: net.Socket, rawMessage: string): void {
    let message: any
    try {
      message = JSON.parse(rawMessage)
    } catch {
      socket.write(JSON.stringify({ status: 'error', message: 'invalid_json' }) + '\n')
      socket.end()
      return
    }

    const action = message?.action

    if (action === 'activate') {
      if (this.sessionActive) {
        // Already active: confirm to client so it can exit cleanly
        socket.write(JSON.stringify({ status: 'already_active', token: this.sessionToken }) + '\n')
        socket.end()
        return
      }

      const foregroundProcess = typeof message?.foregroundProcess === 'string' ? message.foregroundProcess : undefined
      const check = this.isActivationEligible(foregroundProcess)
      console.log(`[ScreensaverSessionService] Activation request (foreground=${foregroundProcess || 'none'}):`, check)
      if (!check.eligible) {
        socket.write(JSON.stringify({ status: 'rejected', reason: check.reason }) + '\n')
        socket.end()
        return
      }

      const activated = this.enterScreensaverMode(socket)
      if (activated) {
        // Handshake complete: write activation confirmation and close socket so Kissa.scr can exit immediately
        socket.write(JSON.stringify({ status: 'activated', token: this.sessionToken }) + '\n')
        socket.end()
      } else {
        socket.write(JSON.stringify({ status: 'rejected', reason: 'transition_failed' }) + '\n')
        socket.end()
      }
    } else if (action === 'configure') {
      this.handleConfigure()
      socket.write(JSON.stringify({ status: 'configured' }) + '\n')
      socket.end()
    } else if (action === 'ping') {
      socket.write(JSON.stringify({ status: 'pong', isScreensaver: this.sessionActive }) + '\n')
      socket.end()
    } else {
      socket.write(JSON.stringify({ status: 'unknown_action' }) + '\n')
      socket.end()
    }
  }

  public enterScreensaverMode(socket?: net.Socket): boolean {
    if (this.sessionActive) {
      return true
    }

    const wm = WindowManager.getInstance()
    const transitioned = wm.enterScreensaverMode()
    if (!transitioned) {
      return false
    }

    this.sessionActive = true
    this.sessionToken = crypto.randomUUID()
    this.activeClientSocket = socket ?? null
    return true
  }

  public exitScreensaverMode(): void {
    if (!this.sessionActive) return

    this.sessionActive = false
    this.sessionToken = null

    // Restore the window state in WindowManager
    WindowManager.getInstance().exitScreensaverMode()

    // Notify client socket if still open
    if (this.activeClientSocket && !this.activeClientSocket.destroyed) {
      try {
        this.activeClientSocket.write(JSON.stringify({ action: 'wake' }) + '\n')
        this.activeClientSocket.end()
      } catch {
        // Socket may already be closed
      }
      this.activeClientSocket = null
    }
  }

  public notifyWake(): void {
    this.exitScreensaverMode()
  }

  public onPlaybackStateChanged(isPlaying: boolean, videoState: VideoPlaybackState): void {
    // If screensaver is active and music playback stops OR video playback is detected or unknown,
    // immediately exit screensaver mode and restore normal window state.
    if (this.sessionActive && (!isPlaying || videoState !== 'not_detected')) {
      console.log(`[ScreensaverSessionService] Auto-waking screensaver (isPlaying=${isPlaying}, videoState=${videoState})`)
      this.notifyWake()
    }
  }

  public handleConfigure(): void {
    if (this.sessionActive) {
      this.notifyWake()
    }
    const win = WindowManager.getInstance().getMainWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
      win.webContents.send('kissa:open-settings')
    }
  }

  public stop(): void {
    if (this.sessionActive) {
      this.exitScreensaverMode()
    }

    if (this.activeClientSocket) {
      try {
        this.activeClientSocket.destroy()
      } catch {}
      this.activeClientSocket = null
    }

    if (this.server) {
      try {
        this.server.close()
      } catch {}
      this.server = null
    }
  }
}
