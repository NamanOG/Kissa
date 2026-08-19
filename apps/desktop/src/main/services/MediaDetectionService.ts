import { BrowserWindow, ipcMain, shell } from 'electron'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { exec } from 'child_process'
import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest } from '../../types/lyrics'
import { LyricsService } from './LyricsService'

function sendMediaKey(keyCode: number): void {
  try {
    exec(`powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]${keyCode})"`)
  } catch (err) {
    console.warn('[MediaDetectionService] Failed to send media key:', err)
  }
}

export class MediaDetectionService {
  private static instance: MediaDetectionService
  private worker: Worker | null = null
  private latestPayload: SystemMediaPayload | null = null

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
      // 179 = 0xB3 (VK_MEDIA_PLAY_PAUSE)
      sendMediaKey(179)
    })

    ipcMain.handle('phono:media-next', () => {
      // 176 = 0xB0 (VK_MEDIA_NEXT_TRACK)
      sendMediaKey(176)
    })

    ipcMain.handle('phono:media-prev', () => {
      // 177 = 0xB1 (VK_MEDIA_PREV_TRACK)
      sendMediaKey(177)
    })

    ipcMain.handle('phono:open-external', (_event, url: string) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url)
      }
    })

    ipcMain.handle('phono:get-app-version', () => {
      return require('electron').app.getVersion()
    })

    try {
      const workerPath = join(__dirname, 'smtcWorker.js')

      this.worker = new Worker(workerPath)

      this.worker.on('message', (msg) => {
        if (msg?.type === 'MEDIA_UPDATE') {
          this.latestPayload = msg.payload
          this.broadcast(msg.payload)
        }
      })

      this.worker.on('error', (err) => {
        console.warn('[MediaDetectionService] Worker encountered error:', err)
      })

      this.worker.on('exit', (code) => {
        console.log('[MediaDetectionService] Worker exited with code:', code)
        this.worker = null
      })
    } catch (err) {
      console.warn('[MediaDetectionService] Could not launch SMTC worker:', err)
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
        this.worker.postMessage({ type: 'DESTROY' })
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
