import { BrowserWindow, ipcMain, shell, app as electronApp } from 'electron'
import { exec } from 'child_process'
import { SMTCMonitor, PlaybackStatus, type MediaInfo } from '@coooookies/windows-smtc-monitor'
import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest } from '../../types/lyrics'
import { LyricsService } from './LyricsService'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { ScreensaverSessionService } from './ScreensaverSessionService'

function sendMediaKey(keyCode: number): void {
  try {
    exec(`powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]${keyCode})"`)
  } catch (err) {
    console.warn('[MediaDetectionService] Failed to send media key:', err)
  }
}

function getCleanAppName(sourceAppId: string): string {
  if (!sourceAppId) return 'Media Player'
  const lower = sourceAppId.toLowerCase()
  if (lower.includes('applemusic') || lower.includes('apple music') || lower.includes('itunes')) {
    return 'Apple Music'
  }
  if (lower.includes('spotify')) {
    return 'Spotify'
  }
  if (lower.includes('tidal')) {
    return 'TIDAL'
  }
  if (lower.includes('chrome')) {
    return 'Chrome'
  }
  if (lower.includes('msedge') || lower.includes('edge')) {
    return 'Microsoft Edge'
  }
  if (lower.includes('firefox')) {
    return 'Firefox'
  }
  if (lower.includes('brave')) {
    return 'Brave'
  }
  if (lower.includes('opera')) {
    return 'Opera'
  }
  if (lower.includes('vivaldi')) {
    return 'Vivaldi'
  }
  if (lower.includes('arc')) {
    return 'Arc'
  }
  if (lower.includes('comet')) {
    return 'Browser'
  }
  if (lower.includes('youtube')) {
    return 'YouTube'
  }
  if (lower.includes('foobar')) {
    return 'foobar2000'
  }
  // Strip file extension / path
  const filename = sourceAppId.split(/[\\/]/).pop() || sourceAppId
  return filename.replace(/\.(exe|appx)$/i, '')
}

function normalizeTime(raw: number | undefined | null): number {
  if (!raw || raw <= 0 || !Number.isFinite(raw)) return 0
  // If > 10 million, value is in 100ns ticks (Windows TimeSpan)
  if (raw >= 10_000_000) {
    return Math.round(raw / 10_000_000)
  }
  // If between 86,400 (1 day in seconds) and 10 million, likely in milliseconds
  if (raw > 86_400) {
    return Math.round(raw / 1000)
  }
  return Math.round(raw)
}

import { ArtworkService } from './ArtworkService'

function formatSession(
  session: any,
  volumeInfo?: { master?: number; isMuted?: boolean }
): SystemMediaPayload | null {
  const masterVol = volumeInfo?.master !== undefined ? volumeInfo.master : 100
  const isMuted = volumeInfo?.isMuted ?? false

  if (!session || !session.media) return null

  // If the session is explicitly Closed (0) or Stopped (3), treat it as cleared.
  // This prevents zombie sessions from closed browsers persisting in the UI.
  if (session.playback && (session.playback.playbackStatus === 0 || session.playback.playbackStatus === 3)) {
    return null
  }

  let artworkDataUrl: string | undefined = undefined

  const thumbBase64 = session.media.thumbnailBase64
  if (typeof thumbBase64 === 'string' && thumbBase64.length > 20 && thumbBase64 !== 'null') {
    const isPng = thumbBase64.startsWith('iVBORw0KGgo')
    const mime = isPng ? 'image/png' : 'image/jpeg'
    artworkDataUrl = `data:${mime};base64,${thumbBase64}`
  } else if (session.media.thumbnail) {
    try {
      const buf = Buffer.isBuffer(session.media.thumbnail)
        ? session.media.thumbnail
        : Buffer.from(session.media.thumbnail)
      if (buf.length > 0) {
        const isPng = buf[0] === 0x89 && buf[1] === 0x50
        const mime = isPng ? 'image/png' : 'image/jpeg'
        artworkDataUrl = `data:${mime};base64,${buf.toString('base64')}`
      }
    } catch {
      artworkDataUrl = undefined
    }
  }

  let title = (session.media.title || '').trim()
  
  // If the session has no title, consider it an empty/uninitialized session.
  // Apple Music and Spotify often create these when launched but not playing.
  if (!title) return null

  let artist = (session.media.artist || '').trim() || 'Unknown Artist'
  let album = (session.media.albumTitle || '').trim()

  // Clean Apple Music format: "Artist - Album" in artist field
  if (artist.includes(' — ')) {
    const parts = artist.split(' — ')
    artist = parts[0].trim()
    if (!album || album === title) {
      album = parts.slice(1).join(' — ').trim()
    }
  } else if (artist.includes(' - ')) {
    const parts = artist.split(' - ')
    if (parts[0].length > 1 && parts[1].length > 1) {
      artist = parts[0].trim()
      if (!album || album === title) {
        album = parts.slice(1).join(' - ').trim()
      }
    }
  }

  const cachedArtwork = ArtworkService.getInstance().getCachedArtwork(title, artist)
  if (cachedArtwork && (cachedArtwork.startsWith('http://') || cachedArtwork.startsWith('https://'))) {
    artworkDataUrl = cachedArtwork
  } else if (artworkDataUrl) {
    ArtworkService.getInstance().setCachedArtwork(title, artist, artworkDataUrl)
  } else if (cachedArtwork) {
    artworkDataUrl = cachedArtwork
  }

  const isPlaying = session.playback?.playbackStatus === PlaybackStatus.PLAYING // 4

  return {
    sourceAppId: session.sourceAppId,
    sourceAppName: getCleanAppName(session.sourceAppId),
    title,
    artist,
    album,
    artworkDataUrl,
    isPlaying,
    progress: Math.max(0, normalizeTime(session.timeline?.position || 0)),
    duration: Math.max(0, normalizeTime(session.timeline?.duration || 0)),
    lastUpdatedTime: session.lastUpdatedTime || Date.now(),
    volume: masterVol,
    isMuted
  }
}

export type VideoPlaybackState = 'detected' | 'not_detected' | 'unknown'

export class MediaDetectionService {
  private static instance: MediaDetectionService
  private static readonly FRESHNESS_WINDOW_MS = 3000
  private worker: Worker | null = null
  private latestPayload: SystemMediaPayload | null = null
  private lastPayloadJson: string | null = null
  private latestVolume: { master: number; isMuted: boolean } = { master: 100, isMuted: false }
  private videoPlaybackState: VideoPlaybackState = 'unknown'
  private lastUpdateTimestamp: number = 0
  private isWorkerHealthy: boolean = false
  private isInternalAudioPlaying: boolean = false

  private constructor() { }

  public static getInstance(): MediaDetectionService {
    if (!MediaDetectionService.instance) {
      MediaDetectionService.instance = new MediaDetectionService()
    }
    return MediaDetectionService.instance
  }

  public getVideoPlaybackState(): VideoPlaybackState {
    if (!this.isWorkerHealthy || Date.now() - this.lastUpdateTimestamp > MediaDetectionService.FRESHNESS_WINDOW_MS) {
      return 'unknown'
    }
    return this.videoPlaybackState
  }

  public isMusicPlaying(): boolean {
    if (this.isInternalAudioPlaying) {
      return true
    }

    if (!this.isWorkerHealthy || Date.now() - this.lastUpdateTimestamp > MediaDetectionService.FRESHNESS_WINDOW_MS) {
      return false
    }

    if (!this.latestPayload || !this.latestPayload.isPlaying) {
      return false
    }

    const title = this.latestPayload.title?.trim()
    if (!title) {
      return false
    }

    const sourceAppId = this.latestPayload.sourceAppId?.toLowerCase() || ''
    const isBrowserSource =
      sourceAppId.includes('chrome') ||
      sourceAppId.includes('edge') ||
      sourceAppId.includes('msedge') ||
      sourceAppId.includes('firefox') ||
      sourceAppId.includes('brave') ||
      sourceAppId.includes('opera') ||
      sourceAppId.includes('vivaldi') ||
      sourceAppId.includes('arc')

    if (isBrowserSource && this.videoPlaybackState !== 'not_detected') {
      return false
    }

    return true
  }

  public setInternalAudioPlaying(isPlaying: boolean): void {
    if (this.isInternalAudioPlaying !== isPlaying) {
      this.isInternalAudioPlaying = isPlaying
      ScreensaverSessionService.getInstance().onPlaybackStateChanged(
        this.isMusicPlaying(),
        this.getVideoPlaybackState()
      )
    }
  }

  public hasActiveVideo(): boolean {
    return this.getVideoPlaybackState() !== 'not_detected'
  }

  public getLatestPayload(): SystemMediaPayload | null {
    return this.latestPayload
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    this.latestVolume.master = clamped
    if (this.worker) {
      try {
        this.worker.postMessage({ action: 'setVolume', volume: clamped })
      } catch (err) {
        console.warn('[MediaDetectionService] Failed to send setVolume to worker:', err)
      }
    }
  }

  public start(): void {
    if (this.worker) return

    // Register IPC handler for one-time fetch
    ipcMain.handle('kissa:get-system-media', () => {
      return this.latestPayload
    })

    ipcMain.handle('kissa:get-lyrics', (_event, request: LyricsRequest) => {
      return LyricsService.getInstance().getLyrics(request)
    })

    // Register volume control IPC handlers
    ipcMain.handle('kissa:set-volume', (_event, vol: number) => {
      this.setVolume(vol)
    })

    ipcMain.handle('kissa:get-volume', () => {
      return this.latestVolume
    })

    // Register transport control IPC handlers
    ipcMain.handle('kissa:media-play-pause', () => {
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'playPause' })
      } else {
        sendMediaKey(179)
      }
    })

    ipcMain.handle('kissa:media-next', () => {
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'next' })
      } else {
        sendMediaKey(176)
      }
    })

    ipcMain.handle('kissa:media-prev', () => {
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'prev' })
      } else {
        sendMediaKey(177)
      }
    })

    ipcMain.handle('kissa:media-seek', (_event, positionSeconds: number) => {
      if (typeof positionSeconds !== 'number' || isNaN(positionSeconds) || !isFinite(positionSeconds) || positionSeconds < 0) {
        return
      }
      if (this.worker && this.latestPayload) {
        let clamped = positionSeconds
        if (this.latestPayload.duration && this.latestPayload.duration > 0) {
          clamped = Math.min(clamped, this.latestPayload.duration)
        }
        this.worker.postMessage({ action: 'seek', position: clamped })
      }
    })

    ipcMain.handle('kissa:open-external', (_event, url: string) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url)
      }
    })

    ipcMain.handle('kissa:get-app-version', () => {
      return electronApp.getVersion()
    })

    try {
      console.log('[MediaDetectionService] Resolving absolute path to SMTC helper...')

      let helperPath = ''
      if (electronApp.isPackaged) {
        helperPath = join(process.resourcesPath, 'smtc-helper.exe')
      } else {
        helperPath = join(electronApp.getAppPath(), 'resources', 'smtc-helper.exe')
      }

      console.log(`[MediaDetectionService] Resolved helper path: ${helperPath}`)

      this.worker = new Worker(join(__dirname, 'smtcWorker.js'), {
        workerData: { helperPath }
      })

      this.worker.on('message', (msg) => {
        if (msg.type === 'update') {
          this.isWorkerHealthy = true
          this.lastUpdateTimestamp = Date.now()

          if (msg.videoState === 'detected' || msg.videoState === 'not_detected' || msg.videoState === 'unknown') {
            this.videoPlaybackState = msg.videoState
          } else if (typeof msg.hasActiveVideoPlayback === 'boolean') {
            this.videoPlaybackState = msg.hasActiveVideoPlayback ? 'detected' : 'not_detected'
          }

          if (msg.volume) {
            this.latestVolume = {
              master: msg.volume.master ?? 100,
              isMuted: msg.volume.isMuted ?? false
            }
          }
          this.processSessionUpdate(msg.session, msg.volume)
          ScreensaverSessionService.getInstance().onPlaybackStateChanged(
            this.isMusicPlaying(),
            this.getVideoPlaybackState()
          )
        } else if (msg.type === 'error') {
          console.warn('[MediaDetectionService] Worker reported error:', msg.error)
          this.videoPlaybackState = 'unknown'
          ScreensaverSessionService.getInstance().onPlaybackStateChanged(
            this.isMusicPlaying(),
            this.getVideoPlaybackState()
          )
        }
      })

      this.worker.on('error', (err) => {
        console.error('[MediaDetectionService] Worker threw error:', err)
        this.isWorkerHealthy = false
        this.videoPlaybackState = 'unknown'
        ScreensaverSessionService.getInstance().onPlaybackStateChanged(
          this.isMusicPlaying(),
          this.getVideoPlaybackState()
        )
      })

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[MediaDetectionService] Worker stopped with exit code ${code}`)
        }
        this.isWorkerHealthy = false
        this.videoPlaybackState = 'unknown'
        ScreensaverSessionService.getInstance().onPlaybackStateChanged(
          this.isMusicPlaying(),
          this.getVideoPlaybackState()
        )
      })

      console.log('[MediaDetectionService] SMTC worker spawned successfully.')
    } catch (err) {
      console.warn('[MediaDetectionService] Could not launch SMTC worker:', err)
    }
  }

  private processSessionUpdate(session: MediaInfo | null, volumeInfo?: { master?: number; isMuted?: boolean }): void {
    const payload = formatSession(session, volumeInfo || this.latestVolume)
    const json = JSON.stringify(payload)
    if (json !== this.lastPayloadJson) {
      this.lastPayloadJson = json
      this.latestPayload = payload
      this.broadcast(payload)
    }

    const needsWebArtwork = !payload?.artworkDataUrl || payload.artworkDataUrl.startsWith('data:')
    if (payload && payload.title && payload.artist && needsWebArtwork) {
      const currentTitle = payload.title
      const currentArtist = payload.artist
      ArtworkService.getInstance()
        .fetchArtwork(payload.title, payload.artist, payload.album)
        .then((fetchedUrl) => {
          if (fetchedUrl && this.latestPayload) {
            if (
              this.latestPayload.title === currentTitle &&
              this.latestPayload.artist === currentArtist &&
              this.latestPayload.artworkDataUrl !== fetchedUrl
            ) {
              this.latestPayload = {
                ...this.latestPayload,
                artworkDataUrl: fetchedUrl
              }
              this.lastPayloadJson = JSON.stringify(this.latestPayload)
              this.broadcast(this.latestPayload)
            }
          }
        })
        .catch(() => {
        })
    }
  }

  private broadcast(payload: SystemMediaPayload | null): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents) {
        win.webContents.send('kissa:system-media-update', payload)
      }
    }
  }

  public stop(): void {
    this.isWorkerHealthy = false
    this.videoPlaybackState = 'unknown'
    if (this.worker) {
      try {
        this.worker.postMessage('stop')
        this.worker.terminate()
      } catch {
      }
      this.worker = null
    }
    if (ipcMain && typeof ipcMain.removeHandler === 'function') {
      ipcMain.removeHandler('kissa:get-system-media')
      ipcMain.removeHandler('kissa:get-lyrics')
      ipcMain.removeHandler('kissa:set-volume')
      ipcMain.removeHandler('kissa:get-volume')
      ipcMain.removeHandler('kissa:media-play-pause')
      ipcMain.removeHandler('kissa:media-next')
      ipcMain.removeHandler('kissa:media-prev')
      ipcMain.removeHandler('kissa:media-seek')
      ipcMain.removeHandler('kissa:open-external')
      ipcMain.removeHandler('kissa:get-app-version')
    }
  }
}
