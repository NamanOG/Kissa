import { BrowserWindow, ipcMain, shell, app as electronApp } from 'electron'
import { exec } from 'child_process'
import { SMTCMonitor, PlaybackStatus, type MediaInfo } from '@coooookies/windows-smtc-monitor'
import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest } from '../../types/lyrics'
import { LyricsService } from './LyricsService'
import { Worker } from 'worker_threads'
import { join } from 'path'

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

function formatSession(session: any): SystemMediaPayload | null {
  if (!session || !session.media) return null

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

  const title = session.media.title || 'Unknown Title'
  const artist = session.media.artist || 'Unknown Artist'

  if (artworkDataUrl) {
    ArtworkService.getInstance().setCachedArtwork(title, artist, artworkDataUrl)
  } else {
    artworkDataUrl = ArtworkService.getInstance().getCachedArtwork(title, artist)
  }

  const isPlaying = session.playback?.playbackStatus === PlaybackStatus.PLAYING // 4

  return {
    sourceAppId: session.sourceAppId,
    sourceAppName: getCleanAppName(session.sourceAppId),
    title,
    artist,
    album: session.media.albumTitle || '',
    artworkDataUrl,
    isPlaying,
    progress: Math.max(0, normalizeTime(session.timeline?.position || 0)),
    duration: Math.max(0, normalizeTime(session.timeline?.duration || 0)),
    lastUpdatedTime: session.lastUpdatedTime || Date.now()
  }
}

export class MediaDetectionService {
  private static instance: MediaDetectionService
  private worker: Worker | null = null
  private latestPayload: SystemMediaPayload | null = null
  private lastPayloadJson: string | null = null

  private constructor() {}

  public static getInstance(): MediaDetectionService {
    if (!MediaDetectionService.instance) {
      MediaDetectionService.instance = new MediaDetectionService()
    }
    return MediaDetectionService.instance
  }

  public start(): void {
    if (this.worker) return

    // Register IPC handler for one-time fetch
    ipcMain.handle('phono:get-system-media', () => {
      return this.latestPayload
    })

    ipcMain.handle('phono:get-lyrics', (_event, request: LyricsRequest) => {
      return LyricsService.getInstance().getLyrics(request)
    })

    // Register transport control IPC handlers
    ipcMain.handle('phono:media-play-pause', () => {
      sendMediaKey(179)
    })

    ipcMain.handle('phono:media-next', () => {
      sendMediaKey(176)
    })

    ipcMain.handle('phono:media-prev', () => {
      sendMediaKey(177)
    })

    ipcMain.handle('phono:open-external', (_event, url: string) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url)
      }
    })

    ipcMain.handle('phono:get-app-version', () => {
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

      // Spawn the worker and pass the helper path
      this.worker = new Worker(join(__dirname, 'smtcWorker.js'), {
        workerData: { helperPath }
      })

      this.worker.on('message', (msg) => {
        if (msg.type === 'update') {
          this.processSessionUpdate(msg.session)
        } else if (msg.type === 'error') {
          console.warn('[MediaDetectionService] Worker reported error:', msg.error)
        }
      })

      this.worker.on('error', (err) => {
        console.error('[MediaDetectionService] Worker threw error:', err)
      })

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[MediaDetectionService] Worker stopped with exit code ${code}`)
        }
      })

      console.log('[MediaDetectionService] SMTC worker spawned successfully.')
    } catch (err) {
      console.warn('[MediaDetectionService] Could not launch SMTC worker:', err)
    }
  }

  private processSessionUpdate(session: MediaInfo | null): void {
    const payload = formatSession(session)
    const json = JSON.stringify(payload)
    if (json !== this.lastPayloadJson) {
      this.lastPayloadJson = json
      this.latestPayload = payload
      this.broadcast(payload)
    }

    // If artwork was not provided in this payload, fetch in background via iTunes Search API
    if (payload && !payload.artworkDataUrl && payload.title && payload.artist) {
      const currentTitle = payload.title
      const currentArtist = payload.artist
      ArtworkService.getInstance()
        .fetchArtwork(payload.title, payload.artist, payload.album)
        .then((fetchedUrl) => {
          if (fetchedUrl && this.latestPayload) {
            if (
              this.latestPayload.title === currentTitle &&
              this.latestPayload.artist === currentArtist &&
              !this.latestPayload.artworkDataUrl
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
          // Ignore network errors
        })
    }
  }

  private broadcast(payload: SystemMediaPayload | null): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents) {
        win.webContents.send('phono:system-media-update', payload)
      }
    }
  }

  public stop(): void {
    if (this.worker) {
      try {
        this.worker.postMessage('stop')
        this.worker.terminate()
      } catch {
        // Ignore
      }
      this.worker = null
    }
    ipcMain.removeHandler('phono:get-system-media')
    ipcMain.removeHandler('phono:get-lyrics')
    ipcMain.removeHandler('phono:media-play-pause')
    ipcMain.removeHandler('phono:media-next')
    ipcMain.removeHandler('phono:media-prev')
    ipcMain.removeHandler('phono:open-external')
    ipcMain.removeHandler('phono:get-app-version')
  }
}
