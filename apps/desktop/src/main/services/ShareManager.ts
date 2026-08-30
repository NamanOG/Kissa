import { BrowserWindow, ipcMain, dialog, clipboard, nativeImage, NativeImage } from 'electron'
import { join } from 'path'
import { ShareExportOptions, SharePayload } from '../../types/share'

function sanitizeFilename(name: string): string {
  // Remove path separators and illegal Windows characters, and control characters
  let clean = name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '')
  // Trim spaces and dots from start and end
  clean = clean.replace(/^[. ]+|[. ]+$/g, '')
  // Reserved Windows names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
  if (reserved.test(clean) || clean === '') {
    clean = `share`
  }
  // Max length
  return clean.slice(0, 100)
}

function validateShareOptions(options: any): options is ShareExportOptions {
  if (!options || typeof options !== 'object') return false
  if (options.action !== 'copy' && options.action !== 'save') return false
  
  const p = options.payload
  if (!p || typeof p !== 'object') return false
  if (p.type !== 'album' && p.type !== 'collection' && p.type !== 'stats') return false
  if (p.aspectRatio !== '4:5' && p.aspectRatio !== '1:1') return false
  if (!p.data || typeof p.data !== 'object') return false
  
  if (p.type === 'album') {
    if (typeof p.data.album !== 'string' || typeof p.data.artist !== 'string') return false
    if (typeof p.data.playCount !== 'number' || !isFinite(p.data.playCount)) return false
    if (!Array.isArray(p.data.tracksEncountered)) return false
  } else if (p.type === 'collection') {
    if (!Array.isArray(p.data) || p.data.length > 9) return false
    for (const item of p.data) {
      if (!item || typeof item !== 'object') return false
      if (typeof item.album !== 'string' || typeof item.artist !== 'string') return false
    }
  } else if (p.type === 'stats') {
    if (typeof p.data.totalAlbums !== 'number' || !isFinite(p.data.totalAlbums)) return false
    if (typeof p.data.totalPlays !== 'number' || !isFinite(p.data.totalPlays)) return false
    if (typeof p.data.uniqueArtists !== 'number' || !isFinite(p.data.uniqueArtists)) return false
  }
  
  return true
}

export class ShareManager {
  private static instance: ShareManager
  private hiddenWindow: BrowserWindow | null = null
  private currentPayload: SharePayload | null = null
  private currentAction: 'copy' | 'save' | null = null
  private resolveExport: ((result: boolean) => void) | null = null

  private constructor() {}

  public static getInstance(): ShareManager {
    if (!ShareManager.instance) {
      ShareManager.instance = new ShareManager()
    }
    return ShareManager.instance
  }

  public init(): void {
    ipcMain.handle('kissa:export-share', async (_event, options: unknown) => {
      if (!validateShareOptions(options)) {
        console.error('[ShareManager] Invalid share options payload')
        return false
      }
      return this.exportShare(options)
    })

    ipcMain.handle('kissa:get-share-payload', () => {
      return this.currentPayload
    })

    ipcMain.on('kissa:share-ready', async (_event, success: boolean) => {
      if (!success) {
        this.cleanup(false)
        return
      }
      await this.handleShareReady()
    })
  }

  private async exportShare(options: ShareExportOptions): Promise<boolean> {
    if (this.hiddenWindow) {
      this.hiddenWindow.destroy()
      this.hiddenWindow = null
    }

    this.currentPayload = options.payload
    this.currentAction = options.action

    return new Promise((resolve) => {
      this.resolveExport = resolve

      const width = 1080
      const height = options.payload.aspectRatio === '4:5' ? 1350 : 1080

      this.hiddenWindow = new BrowserWindow({
        show: false,
        width,
        height,
        frame: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          nodeIntegration: false,
          contextIsolation: true,
          backgroundThrottling: false,
          offscreen: true // Use offscreen rendering for deterministic capture
        }
      })

      const renderUrl = process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}#/share-export`
        : `file://${join(__dirname, '../renderer/index.html')}#/share-export`

      this.hiddenWindow.loadURL(renderUrl)

      // Timeout in case rendering hangs
      setTimeout(() => {
        if (this.hiddenWindow) {
          console.error('[ShareManager] Export timed out')
          this.cleanup(false)
        }
      }, 15000)
    })
  }

  private async handleShareReady(): Promise<void> {
    if (!this.hiddenWindow || !this.currentPayload || !this.resolveExport || !this.currentAction) return

    try {
      // Capture the exact bounds of the hidden window
      let image: NativeImage = await this.hiddenWindow.webContents.capturePage()

      // Enforce exact dimensions regardless of high DPI scaling
      const targetWidth = 1080
      const targetHeight = this.currentPayload.aspectRatio === '4:5' ? 1350 : 1080
      
      const size = image.getSize()
      if (size.width !== targetWidth || size.height !== targetHeight) {
        image = image.resize({ width: targetWidth, height: targetHeight, quality: 'best' })
      }

      if (this.currentAction === 'copy') {
        clipboard.writeImage(image)
        this.cleanup(true)
      } else if (this.currentAction === 'save') {
        const safeType = sanitizeFilename(this.currentPayload.type)
        const defaultName = `kissa-${safeType}-${Date.now()}.png`
        
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save Share Card',
          defaultPath: defaultName,
          filters: [{ name: 'Images', extensions: ['png'] }]
        })

        if (!canceled && filePath) {
          const fs = await import('fs')
          await fs.promises.writeFile(filePath, image.toPNG())
          this.cleanup(true)
        } else {
          this.cleanup(false) // Canceled
        }
      }
    } catch (e) {
      console.error('[ShareManager] Capture failed', e)
      this.cleanup(false)
    }
  }

  private cleanup(success: boolean): void {
    if (this.hiddenWindow) {
      this.hiddenWindow.destroy()
      this.hiddenWindow = null
    }
    this.currentPayload = null
    this.currentAction = null
    if (this.resolveExport) {
      this.resolveExport(success)
      this.resolveExport = null
    }
  }
}

// Export purely for tests
export const _test_sanitizeFilename = sanitizeFilename
export const _test_validateShareOptions = validateShareOptions
