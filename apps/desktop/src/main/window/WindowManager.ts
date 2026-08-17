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
}
