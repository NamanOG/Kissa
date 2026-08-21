import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getWindowConfig } from './windowConfig'
import { setupWindowEvents } from './windowEvents'
export class WindowManager {
  private static instance: WindowManager
  private mainWindow: BrowserWindow | null = null
  private constructor() {}
  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }
  public createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow(getWindowConfig())
    setupWindowEvents(this.mainWindow)
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
      ipcMain.handle('phono:toggle-mini-player', (_event, isMini: boolean) => {
        if (!this.mainWindow) return
        if (isMini) {
          this.mainWindow.setMinimumSize(320, 320)
          this.mainWindow.setSize(360, 420, true)
          this.mainWindow.setAlwaysOnTop(true)
        } else {
          this.mainWindow.setMinimumSize(800, 600)
          this.mainWindow.setSize(900, 670, true)
          this.mainWindow.setAlwaysOnTop(false)
        }
      })
    })
  }
}
