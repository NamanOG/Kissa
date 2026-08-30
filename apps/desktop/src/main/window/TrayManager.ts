import { app, Tray, Menu, nativeImage } from 'electron'
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
      // Use the existing icon
      const iconPath = join(__dirname, '../../resources/icon.png')
      const icon = nativeImage.createFromPath(iconPath)
      this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
      
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
      { type: 'separator' },
      {
        label: 'Check for Updates...',
        click: () => this.sendTrayAction('checkForUpdates')
      },
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
