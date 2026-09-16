import { app, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { URL } from 'url'
import { spawn } from 'child_process'
import { WindowManager } from '../window/WindowManager'
import type {
  UpdateInstallResult,
  UpdateProgress,
  UpdateInfo,
  UpdateState,
  UpdateStatusPayload
} from '../../types/update'

const GITHUB_REPO = 'NamanOG/Kissa'
export const KISSA_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

export function parseSemver(ver: string): number[] {
  if (!ver || typeof ver !== 'string') return []
  const clean = ver.replace(/^v/i, '').split(/[-+]/)[0].trim()
  if (!clean || !/^\d+(\.\d+)*$/.test(clean)) return []
  return clean.split('.').map((p) => {
    const num = parseInt(p, 10)
    return Number.isFinite(num) ? num : 0
  })
}

export function isNewerVersion(remote: string, local: string): boolean {
  if (!remote || !local) return false
  const cleanRemote = parseSemver(remote)
  const cleanLocal = parseSemver(local)
  if (cleanRemote.length === 0 || cleanLocal.length === 0) return false

  for (let i = 0; i < Math.max(cleanRemote.length, cleanLocal.length); i++) {
    const r = cleanRemote[i] || 0
    const l = cleanLocal[i] || 0
    if (r > l) return true
    if (r < l) return false
  }
  return false
}

export function isSafeDownloadUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return (
      host === 'github.com' ||
      host === 'api.github.com' ||
      host === 'objects.githubusercontent.com' ||
      host.endsWith('.github.com') ||
      host.endsWith('.githubusercontent.com')
    )
  } catch {
    return false
  }
}

export class UpdateService {
  private static instance: UpdateService | null = null

  private state: UpdateState = 'idle'
  private updateInfo: UpdateInfo | null = null
  private progress: UpdateProgress | null = null
  private downloadedFilePath: string | null = null
  private errorMessage: string | null = null
  private activeAbortController: AbortController | null = null

  private constructor() {}

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService()
    }
    return UpdateService.instance
  }

  public isPortable(): boolean {
    return Boolean(
      process.env.PORTABLE_EXECUTABLE_DIR ||
      process.env.PORTABLE_EXECUTABLE_FILE ||
      process.env.PORTABLE_EXECUTABLE_APP_FILENAME
    )
  }

  public isScreensaverActive(): boolean {
    try {
      return WindowManager.getInstance().isScreensaver
    } catch {
      return false
    }
  }

  public getCurrentVersion(): string {
    return app.getVersion() || '0.0.0'
  }

  public getStatusPayload(): UpdateStatusPayload {
    return {
      state: this.state,
      currentVersion: this.getCurrentVersion(),
      updateInfo: this.updateInfo,
      progress: this.progress,
      downloadedFilePath: this.downloadedFilePath,
      error: this.errorMessage,
      isScreensaverActive: this.isScreensaverActive(),
      isPortable: this.isPortable()
    }
  }

  private broadcastStatus(): void {
    try {
      const win = WindowManager.getInstance().getMainWindow()
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('kissa:update-status-changed', this.getStatusPayload())
      }
    } catch {
      // Best-effort notification
    }
  }

  public async checkForUpdates(): Promise<UpdateStatusPayload> {
    if (this.isScreensaverActive()) {
      this.state = 'error'
      this.errorMessage = 'Cannot check for updates while in screensaver mode.'
      this.broadcastStatus()
      return this.getStatusPayload()
    }

    if (this.state === 'downloading') {
      return this.getStatusPayload()
    }

    this.state = 'checking'
    this.errorMessage = null
    this.broadcastStatus()

    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Kissa-Desktop'
        },
        signal: AbortSignal.timeout(8_000)
      })

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`)
      }

      const data = await response.json()
      if (!data || typeof data !== 'object' || !data.tag_name || typeof data.tag_name !== 'string') {
        throw new Error('Malformed release payload from GitHub.')
      }

      if (data.draft || data.prerelease) {
        throw new Error('Latest release is a draft or prerelease.')
      }

      const remoteTag = data.tag_name
      const localVersion = this.getCurrentVersion()

      if (parseSemver(remoteTag).length === 0) {
        throw new Error(`Invalid semver in release tag: ${remoteTag}`)
      }

      const hasUpdate = isNewerVersion(remoteTag, localVersion)

      if (!hasUpdate) {
        this.state = 'up-to-date'
        this.updateInfo = null
        this.progress = null
        this.broadcastStatus()
        return this.getStatusPayload()
      }

      // Look for the appropriate asset in the release
      const assets = Array.isArray(data.assets) ? data.assets : []
      const isPortable = this.isPortable()

      let targetAsset = assets.find((a: any) => {
        const name = typeof a.name === 'string' ? a.name : ''
        return isPortable
          ? name.startsWith('Kissa-Portable-') && name.endsWith('.exe')
          : name.startsWith('Kissa-Setup-') && name.endsWith('.exe')
      })

      if (!targetAsset) {
        // Fallback: look for any .exe installer/portable
        targetAsset = assets.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.exe'))
      }

      if (!targetAsset || !targetAsset.browser_download_url) {
        throw new Error(`No compatible release asset found for ${remoteTag}.`)
      }

      if (!isSafeDownloadUrl(targetAsset.browser_download_url)) {
        throw new Error('Release asset URL is not from a trusted source.')
      }

      this.state = 'available'
      this.updateInfo = {
        version: remoteTag,
        releaseName: data.name || remoteTag,
        releaseDate: data.published_at || data.created_at,
        releaseNotes: data.body || '',
        assetName: targetAsset.name,
        assetSize: typeof targetAsset.size === 'number' ? targetAsset.size : 0,
        downloadUrl: targetAsset.browser_download_url,
        isPortable
      }
      this.progress = null
      this.downloadedFilePath = null
      this.broadcastStatus()
      return this.getStatusPayload()
    } catch (err: any) {
      this.state = 'error'
      this.errorMessage = err?.message || 'Failed to check for updates.'
      this.broadcastStatus()
      return this.getStatusPayload()
    }
  }

  public async downloadUpdate(): Promise<UpdateStatusPayload> {
    if (this.isScreensaverActive()) {
      this.state = 'error'
      this.errorMessage = 'Cannot download updates while in screensaver mode.'
      this.broadcastStatus()
      return this.getStatusPayload()
    }

    if (!this.updateInfo || !this.updateInfo.downloadUrl) {
      this.state = 'error'
      this.errorMessage = 'No update available to download.'
      this.broadcastStatus()
      return this.getStatusPayload()
    }

    if (this.state === 'downloading') {
      return this.getStatusPayload()
    }

    this.state = 'downloading'
    this.errorMessage = null
    this.progress = {
      percent: 0,
      transferredBytes: 0,
      totalBytes: this.updateInfo.assetSize,
      bytesPerSecond: 0
    }
    this.broadcastStatus()

    const abortController = new AbortController()
    this.activeAbortController = abortController

    const targetDir = this.isPortable()
      ? app.getPath('downloads')
      : path.join(app.getPath('temp'), 'kissa-update')

    try {
      fs.mkdirSync(targetDir, { recursive: true })
    } catch (err: any) {
      this.state = 'error'
      this.errorMessage = `Could not create directory for download: ${err?.message}`
      this.broadcastStatus()
      return this.getStatusPayload()
    }

    const safeFileName = path.basename(this.updateInfo.assetName)
    const finalFilePath = path.join(targetDir, safeFileName)
    const tempFilePath = `${finalFilePath}.download`

    let lastProgressEmit = Date.now()
    let lastBytes = 0
    let lastTime = Date.now()

    try {
      await this.streamDownload(
        this.updateInfo.downloadUrl,
        tempFilePath,
        abortController.signal,
        (transferred, total) => {
          const now = Date.now()
          const timeDiff = (now - lastTime) / 1000
          let bytesPerSecond = 0
          if (timeDiff >= 0.5) {
            bytesPerSecond = Math.round((transferred - lastBytes) / timeDiff)
            lastBytes = transferred
            lastTime = now
          }

          const totalToUse = total > 0 ? total : this.updateInfo?.assetSize || 0
          const percent = totalToUse > 0 ? Math.min(100, Math.round((transferred / totalToUse) * 100)) : 0

          this.progress = {
            percent,
            transferredBytes: transferred,
            totalBytes: totalToUse,
            bytesPerSecond
          }

          if (now - lastProgressEmit >= 100 || percent === 100) {
            lastProgressEmit = now
            this.broadcastStatus()
          }
        }
      )

      // Verification: verify file exists and is not empty
      const stats = fs.statSync(tempFilePath)
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty.')
      }

      if (this.updateInfo.assetSize > 0 && stats.size !== this.updateInfo.assetSize) {
        throw new Error(
          `Downloaded size (${stats.size}) does not match expected size (${this.updateInfo.assetSize}).`
        )
      }

      // Atomically move .download to final .exe
      if (fs.existsSync(finalFilePath)) {
        try {
          fs.unlinkSync(finalFilePath)
        } catch {
          // ignore
        }
      }
      fs.renameSync(tempFilePath, finalFilePath)

      this.downloadedFilePath = finalFilePath
      this.state = 'downloaded'
      this.progress = {
        percent: 100,
        transferredBytes: stats.size,
        totalBytes: stats.size,
        bytesPerSecond: 0
      }
      this.broadcastStatus()
      return this.getStatusPayload()
    } catch (err: any) {
      // Clean up partial temp file if it exists
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath)
        }
      } catch {
        // ignore
      }

      if (abortController.signal.aborted) {
        this.state = 'cancelled'
        this.errorMessage = null
      } else {
        this.state = 'error'
        this.errorMessage = err?.message || 'Download failed.'
      }

      this.progress = null
      this.activeAbortController = null
      this.broadcastStatus()
      return this.getStatusPayload()
    } finally {
      this.activeAbortController = null
    }
  }

  public cancelDownload(): UpdateStatusPayload {
    if (this.activeAbortController) {
      this.activeAbortController.abort()
      this.activeAbortController = null
    }
    this.state = 'cancelled'
    this.progress = null
    this.broadcastStatus()
    return this.getStatusPayload()
  }

  public async installUpdate(): Promise<UpdateInstallResult> {
    if (this.isScreensaverActive()) {
      return { success: false, error: 'Cannot install updates while in screensaver mode.' }
    }

    if (this.state !== 'downloaded' || !this.downloadedFilePath) {
      return { success: false, error: 'No downloaded update file ready to install.' }
    }

    if (!fs.existsSync(this.downloadedFilePath)) {
      this.state = 'error'
      this.errorMessage = 'Downloaded update file not found on disk.'
      this.broadcastStatus()
      return { success: false, error: 'Downloaded update file not found on disk.' }
    }

    if (this.isPortable()) {
      // For portable, reveal file in Explorer and let user launch it
      shell.showItemInFolder(this.downloadedFilePath)
      return { success: true, action: 'revealed' }
    }

    // For installed NSIS: launch installer detached and exit cleanly
    try {
      this.state = 'installing'
      this.broadcastStatus()

      const child = spawn(this.downloadedFilePath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()

      // Allow brief moment for process spawn handoff then quit
      setTimeout(() => {
        app.quit()
      }, 300)

      return { success: true, action: 'restarting' }
    } catch (err: any) {
      this.state = 'error'
      this.errorMessage = `Failed to launch installer: ${err?.message}`
      this.broadcastStatus()
      return { success: false, error: this.errorMessage }
    }
  }

  private streamDownload(
    urlStr: string,
    destPath: string,
    signal: AbortSignal,
    onProgress: (transferred: number, total: number) => void,
    redirectCount = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects while downloading update.'))
      }

      if (!isSafeDownloadUrl(urlStr)) {
        return reject(new Error(`Untrusted redirect URL: ${urlStr}`))
      }

      const parsedUrl = new URL(urlStr)
      const req = https.get(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {
            'User-Agent': 'Kissa-Desktop',
            Accept: '*/*'
          }
        },
        (res) => {
          // Handle HTTP redirects (GitHub Releases redirect to objects.githubusercontent.com)
          if (
            (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) &&
            res.headers.location
          ) {
            let redirectUrl = res.headers.location
            if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, urlStr).toString()
            }
            res.resume() // discard response body
            return this.streamDownload(redirectUrl, destPath, signal, onProgress, redirectCount + 1)
              .then(resolve)
              .catch(reject)
          }

          if (res.statusCode !== 200) {
            res.resume()
            return reject(new Error(`Server responded with status code ${res.statusCode}`))
          }

          const contentLengthHeader = res.headers['content-length']
          const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0
          let transferredBytes = 0

          const fileStream = fs.createWriteStream(destPath)

          res.on('data', (chunk: Buffer) => {
            transferredBytes += chunk.length
            onProgress(transferredBytes, totalBytes)
          })

          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close(() => resolve())
          })

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {})
            reject(err)
          })

          res.on('error', (err) => {
            fs.unlink(destPath, () => {})
            reject(err)
          })
        }
      )

      req.on('error', (err) => {
        reject(err)
      })

      signal.addEventListener('abort', () => {
        req.destroy()
        reject(new Error('Download cancelled by user.'))
      })
    })
  }

  public setupIpcHandlers(): void {
    ipcMain.handle('kissa:get-update-status', () => {
      return this.getStatusPayload()
    })

    ipcMain.handle('kissa:check-for-updates', () => {
      return this.checkForUpdates()
    })

    ipcMain.handle('kissa:download-update', () => {
      return this.downloadUpdate()
    })

    ipcMain.handle('kissa:cancel-update', () => {
      return this.cancelDownload()
    })

    ipcMain.handle('kissa:install-update', () => {
      return this.installUpdate()
    })
  }
}
