import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window/WindowManager'
import { TrayManager } from './window/TrayManager'
import { MediaDetectionService } from './services/MediaDetectionService'
import { ShareManager } from './services/ShareManager'
import { ScreensaverSessionService } from './services/ScreensaverSessionService'

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const wm = WindowManager.getInstance()
    if (wm.isScreensaver) {
      ScreensaverSessionService.getInstance().notifyWake()
    }
    const mainWindow = wm.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.namanog.kissa')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Start background system media detection (Apple Music, Spotify, etc.)
    MediaDetectionService.getInstance().start()

    // Start named pipe server for Windows screensaver supervisor coordination
    ScreensaverSessionService.getInstance().start()

    // Use the dedicated WindowManager module
    const isHidden = process.argv.includes('--hidden')
    const isScreensaver = process.argv.includes('--screensaver')
    WindowManager.getInstance().createMainWindow(isHidden, isScreensaver)
    WindowManager.getInstance().setupIpcHandlers()
    
    ShareManager.getInstance().init()

    TrayManager.getInstance().init()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        WindowManager.getInstance().createMainWindow()
      }
    })
  })

  app.on('before-quit', () => {
    ScreensaverSessionService.getInstance().stop()
    MediaDetectionService.getInstance().stop()
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    const wm = WindowManager.getInstance()
    if (process.platform !== 'darwin' && (!wm.isBackgroundEnabled || wm.isQuitting)) {
      app.quit()
    }
  })
}

