import { app, Tray, Menu, nativeImage } from 'electron'
import { StorePackageService } from '../services/StorePackageService'
import { join } from 'path'
import { WindowManager } from './WindowManager'

export class TrayManager {
  private static instance: TrayManager
  private tray: Tray | null = null
  private isPlaying: boolean = false

  private constructor() {}

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager()
    }
    return TrayManager.instance
  }

  public init(): void {
    if (this.tray) return

    try {
      // Multi-size ICO from build/generate_store_assets.py: Windows takes the 16, 20, 24 or 32 px frame
      // for the display scale instead of a 16 px image shrunk from the 512 px artwork.
      const iconPath = join(__dirname, '../../resources/icon.ico')
      this.tray = new Tray(nativeImage.createFromPath(iconPath))
      
      this.tray.setToolTip('Kissa')
      
      this.tray.on('click', () => {
        const win = WindowManager.getInstance().getMainWindow()
        if (win) {
          if (win.isVisible()) {
            win.focus()
          } else {
            win.show()
          }
        }
      })

      this.updateContextMenu()
    } catch (err) {
      console.warn('[TrayManager] Failed to initialize tray:', err)
    }
  }

  public updatePlaybackState(isPlaying: boolean): void {
    if (this.isPlaying !== isPlaying) {
      this.isPlaying = isPlaying
      this.updateContextMenu()
    }
  }

  private sendTrayAction(action: string): void {
    const win = WindowManager.getInstance().getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('kissa:tray-action', action)
    }
  }

  private updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Kissa',
        click: () => {
          const win = WindowManager.getInstance().getMainWindow()
          if (win) win.show()
        }
      },
      { type: 'separator' },
      {
        label: this.isPlaying ? 'Pause' : 'Play',
        click: () => this.sendTrayAction('togglePlayPause')
      },
      {
        label: 'Previous',
        click: () => this.sendTrayAction('playPrev')
      },
      {
        label: 'Next',
        click: () => this.sendTrayAction('playNext')
      },
      { type: 'separator' },
      {
        label: 'Mini Player',
        click: () => this.sendTrayAction('toggleMiniPlayer')
      },
      // The Store build is updated by the Microsoft Store, so it has nothing to check.
      ...(StorePackageService.getInstance().isStorePackage()
        ? []
        : ([
            { type: 'separator' },
            {
              label: 'Check for Updates...',
              click: () => this.sendTrayAction('checkForUpdates')
            }
          ] as Electron.MenuItemConstructorOptions[])),
      { type: 'separator' },
      {
        label: 'Quit Kissa',
        click: () => {
          WindowManager.getInstance().isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }
}
