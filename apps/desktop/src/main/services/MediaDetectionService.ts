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
  if (lower.includes('zunemusic')) {
    return 'Media Player'
  }
  if (lower.includes('zunevideo')) {
    return 'Films & TV'
  }
  if (lower.includes('foobar')) {
    return 'foobar2000'
  }
  // Packaged apps identify themselves as "Publisher.AppName_hash!Id".
  if (sourceAppId.includes('!')) {
    const family = sourceAppId.split('!')[0].replace(/_[a-z0-9]{10,}$/i, '')
    const name = family.split('.').pop() || family
    return name.replace(/([a-z])([A-Z])/g, '$1 $2')
  }
  const filename = sourceAppId.split(/[\\/]/).pop() || sourceAppId
  return filename.replace(/\.(exe|appx)$/i, '')
}

function normalizeTime(raw: number | undefined | null): number {
  if (!raw || raw <= 0 || !Number.isFinite(raw)) return 0
  if (raw >= 10_000_000) {
    return raw / 10_000_000
  }
  // If between 86,400 (1 day in seconds) and 10 million, likely in milliseconds
  if (raw > 86_400) {
    return raw / 1000
  }
  return raw
}

import { ArtworkService } from './ArtworkService'

/** The last cover the helper sent. It only resends the image when it changes. */
let lastThumbnailDataUrl: string | undefined

function formatSession(
  session: any,
  volumeInfo?: { master?: number; isMuted?: boolean },
  sampledAt?: number
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
    lastThumbnailDataUrl = artworkDataUrl
  } else if (session.media.thumbnailUnchanged === true && lastThumbnailDataUrl) {
    artworkDataUrl = lastThumbnailDataUrl
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

  const cachedArtwork = ArtworkService.getInstance().getCachedArtwork(title, artist, album)
  if (cachedArtwork && (cachedArtwork.startsWith('http://') || cachedArtwork.startsWith('https://'))) {
    artworkDataUrl = cachedArtwork
  } else if (artworkDataUrl) {
    ArtworkService.getInstance().setCachedArtwork(title, artist, artworkDataUrl, album)
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
    canSeek: session.playback?.canSeek !== false,
    progress: Math.max(0, normalizeTime(session.timeline?.position || 0)),
    duration: Math.max(0, normalizeTime(session.timeline?.duration || 0)),
    // When the position was sampled (helper clock, same machine). The renderer uses it
    // to account for the time the message spent in transit.
    lastUpdatedTime: sampledAt || session.lastUpdatedTime || Date.now(),
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
  /** Embedded cover last sent to each window, so position updates do not carry it again. */
  private readonly artworkSentTo = new Map<number, string>()
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

    ipcMain.handle('kissa:get-system-media', (event) => {
      const artwork = this.latestPayload?.artworkDataUrl
      if (artwork && artwork.startsWith('data:')) this.artworkSentTo.set(event.sender.id, artwork)
      return this.latestPayload
    })

    ipcMain.handle('kissa:get-lyrics', (_event, request: LyricsRequest) => {
      return LyricsService.getInstance().getLyrics(request)
    })

    ipcMain.handle('kissa:set-volume', (_event, vol: number) => {
      this.setVolume(vol)
    })

    ipcMain.handle('kissa:get-volume', () => {
      return this.latestVolume
    })

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
          this.processSessionUpdate(msg.session, msg.volume, msg.timestamp)
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

  private processSessionUpdate(
    session: MediaInfo | null,
    volumeInfo?: { master?: number; isMuted?: boolean },
    sampledAt?: number
  ): void {
    const payload = formatSession(session, volumeInfo || this.latestVolume, sampledAt)

    // Preserve high-res web artwork if it's the exact same track and we already fetched it
    if (
      this.latestPayload &&
      payload &&
      this.latestPayload.title?.trim().toLowerCase() === payload.title?.trim().toLowerCase() &&
      this.latestPayload.artist?.trim().toLowerCase() === payload.artist?.trim().toLowerCase() &&
      (this.latestPayload.album || '').trim().toLowerCase() === (payload.album || '').trim().toLowerCase() &&
      this.latestPayload.artworkDataUrl?.startsWith('http')
    ) {
      payload.artworkDataUrl = this.latestPayload.artworkDataUrl
    } else if (payload && (!payload.artworkDataUrl || payload.artworkDataUrl.startsWith('data:'))) {
      const cached = ArtworkService.getInstance().getCachedArtwork(payload.title, payload.artist, payload.album)
      if (cached && cached.startsWith('http')) {
        payload.artworkDataUrl = cached
      }
    }

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
        .fetchArtwork(payload.title, payload.artist, payload.album, !payload.artworkDataUrl)
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
      if (win.isDestroyed() || !win.webContents) continue
      const id = win.webContents.id
      const artwork = payload?.artworkDataUrl

      // An embedded cover can be hundreds of kilobytes. Send it once per window and
      // mark later updates "unchanged"; the preload bridge puts it back.
      if (payload && artwork && artwork.startsWith('data:')) {
        if (this.artworkSentTo.get(id) === artwork) {
          win.webContents.send('kissa:system-media-update', {
            ...payload,
            artworkDataUrl: undefined,
            artworkUnchanged: true
          })
          continue
        }
        this.artworkSentTo.set(id, artwork)
      } else {
        this.artworkSentTo.delete(id)
      }
      win.webContents.send('kissa:system-media-update', payload)
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
