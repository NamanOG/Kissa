import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getWindowConfig } from './windowConfig'
import { setupWindowEvents } from './windowEvents'
import { getPlayIcon, getPauseIcon, getPrevIcon, getNextIcon } from './icons'

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
  private constructor() {}
  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }
  public createMainWindow(isHidden: boolean = false): BrowserWindow {
    this.mainWindow = new BrowserWindow(getWindowConfig())
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

  public setupIpcHandlers(): void {
    import('electron').then(({ ipcMain }) => {
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
        import('electron').then(({ app }) => {
          app.setLoginItemSettings({
            openAtLogin: enabled,
            args: ['--hidden']
          })
        })
      })
    })
  }
}
