import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getWindowConfig } from './windowConfig'
import { setupWindowEvents } from './windowEvents'
import { getPlayIcon, getPauseIcon, getPrevIcon, getNextIcon } from './icons'
import { ScreensaverRegistryService } from '../services/ScreensaverRegistryService'
import { UpdateService } from '../services/UpdateService'
import { ScreensaverSessionService } from '../services/ScreensaverSessionService'
import { MediaDetectionService } from '../services/MediaDetectionService'

export interface SavedWindowState {
  bounds: Electron.Rectangle
  isFullScreen: boolean
  isMaximized: boolean
  isMinimized: boolean
  isVisible: boolean
}

export function setWindowFullscreen(
  mainWindow: Pick<BrowserWindow, 'isFullScreen' | 'setFullScreen'> | null,
  value: unknown
): boolean {
  if (!mainWindow || typeof value !== 'boolean') {
    return mainWindow?.isFullScreen() ?? false
  }

  mainWindow.setFullScreen(value)
  return mainWindow.isFullScreen()
}

export class WindowManager {
  private static instance: WindowManager
  private mainWindow: BrowserWindow | null = null
  public isBackgroundEnabled: boolean = false
  public isQuitting: boolean = false
  public isScreensaver: boolean = false
  private savedWindowState: SavedWindowState | null = null
  private constructor() {}
  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }
  public createMainWindow(isHidden: boolean = false, isScreensaver: boolean = false): BrowserWindow {
    this.isScreensaver = isScreensaver
    const baseConfig = getWindowConfig()
    
    // In screensaver mode, force the window to be fullscreen and hide the menu bar
    const config = isScreensaver 
      ? { ...baseConfig, fullscreen: true, autoHideMenuBar: true }
      : baseConfig

    this.mainWindow = new BrowserWindow(config)
    setupWindowEvents(this.mainWindow, isHidden)
    if (process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
    return this.mainWindow
  }
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public enterScreensaverMode(): boolean {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return false
    }

    if (this.isScreensaver) {
      return true
    }

    this.savedWindowState = {
      bounds: this.mainWindow.getBounds(),
      isFullScreen: this.mainWindow.isFullScreen(),
      isMaximized: this.mainWindow.isMaximized(),
      isMinimized: this.mainWindow.isMinimized(),
      isVisible: this.mainWindow.isVisible()
    }

    this.isScreensaver = true

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
    }

    this.mainWindow.setFullScreen(true)
    this.mainWindow.focus()

    this.mainWindow.webContents.send('kissa:screensaver-mode-changed', true)
    return true
  }

  public exitScreensaverMode(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.isScreensaver = false
      return
    }

    if (!this.isScreensaver) {
      return
    }

    this.isScreensaver = false
    const saved = this.savedWindowState
    this.savedWindowState = null

    this.mainWindow.webContents.send('kissa:screensaver-mode-changed', false)

    if (saved) {
      if (!saved.isFullScreen && this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(false)
      }

      if (saved.isMaximized) {
        this.mainWindow.maximize()
      } else if (saved.bounds) {
        this.mainWindow.setBounds(saved.bounds)
      }

      if (saved.isMinimized) {
        this.mainWindow.minimize()
      }

      if (!saved.isVisible) {
        this.mainWindow.hide()
      }
    } else {
      if (this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(false)
      }
    }
  }

  public setupIpcHandlers(): void {
    import('electron').then(({ ipcMain, app }) => {
      // Screensaver specific scoped IPCs
      ipcMain.handle('kissa:is-screensaver', () => this.isScreensaver)
      
      ipcMain.handle('kissa:exit-screensaver', () => {
        if (this.isScreensaver) {
          ScreensaverSessionService.getInstance().notifyWake()
        }
      })

      ipcMain.handle('kissa:is-screensaver-registered', () => {
        return ScreensaverRegistryService.getInstance().isScreensaverRegistered()
      })

      ipcMain.handle('kissa:register-screensaver', () => {
        return ScreensaverRegistryService.getInstance().registerScreensaver()
      })

      ipcMain.handle('kissa:unregister-screensaver', () => {
        return ScreensaverRegistryService.getInstance().unregisterScreensaver()
      })

      ipcMain.handle('kissa:open-screensaver-settings', () => {
        return ScreensaverRegistryService.getInstance().openScreensaverSettings()
      })

      UpdateService.getInstance().setupIpcHandlers()

      ipcMain.handle('kissa:toggle-mini-player', (_event, isMini: boolean, alwaysOnTop: boolean = true) => {
        if (!this.mainWindow) return
        if (isMini) {
          this.mainWindow.setMinimumSize(320, 320)
          this.mainWindow.setSize(360, 420, true)
          this.mainWindow.setAlwaysOnTop(alwaysOnTop)
        } else {
          this.mainWindow.setMinimumSize(800, 600)
          this.mainWindow.setSize(900, 670, true)
          this.mainWindow.setAlwaysOnTop(false)
        }
      })

      ipcMain.handle('kissa:set-fullscreen', (_event, value: unknown) => {
        return setWindowFullscreen(this.mainWindow, value)
      })

      ipcMain.handle('kissa:sync-settings', (_event, settings: any) => {
        if (settings && typeof settings.runInBackground === 'boolean') {
          this.isBackgroundEnabled = settings.runInBackground
        }
      })

      ipcMain.handle('kissa:set-progress', (_event, progress: number, mode?: 'normal' | 'paused' | 'error' | 'none') => {
        if (!this.mainWindow) return
        this.mainWindow.setProgressBar(progress, { mode: mode || 'normal' })
      })

      ipcMain.handle('kissa:set-thumbar', (_event, isPlaying: boolean) => {
        MediaDetectionService.getInstance().setInternalAudioPlaying(Boolean(isPlaying))
        if (!this.mainWindow) return
        
        this.mainWindow.setThumbarButtons([
          {
            tooltip: 'Previous',
            icon: getPrevIcon(),
            click: () => {
              if (this.mainWindow) this.mainWindow.webContents.send('kissa:tray-action', 'playPrev')
            }
          },
          {
            tooltip: isPlaying ? 'Pause' : 'Play',
            icon: isPlaying ? getPauseIcon() : getPlayIcon(),
            click: () => {
              if (this.mainWindow) this.mainWindow.webContents.send('kissa:tray-action', 'togglePlayPause')
            }
          },
          {
            tooltip: 'Next',
            icon: getNextIcon(),
            click: () => {
              if (this.mainWindow) this.mainWindow.webContents.send('kissa:tray-action', 'playNext')
            }
          }
        ])
      })
      
      ipcMain.handle('kissa:set-startup', (_event, enabled: boolean) => {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          args: ['--hidden']
        })
      })
    })
  }
}
