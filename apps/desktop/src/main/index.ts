import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window/WindowManager'
import { TrayManager } from './window/TrayManager'
import { MediaDetectionService } from './services/MediaDetectionService'
import { ShareManager } from './services/ShareManager'
import { ScreensaverSessionService } from './services/ScreensaverSessionService'
import { ScreensaverRegistryService } from './services/ScreensaverRegistryService'
import { StorePackageService } from './services/StorePackageService'
import { startDiscordPresence, stopDiscordPresence } from './services/discord'
import { startStudyKeepAwake, stopStudyKeepAwake } from './services/StudyKeepAwake'
import { setupPhoneRemote, stopPhoneRemote } from './services/remote'
import { DiagnosticsLog } from './services/DiagnosticsLog'
import { join } from 'path'
import { jumpPlaceFromArgv } from './window/jumpList'
import { TrackToast } from './window/TrackToast'
import { installLoopbackHandler } from './audio/loopback'
import { AlbumFolderService, registerAlbumScheme } from './album/AlbumFolderService'
import { applyGraphicsChoice, setupGraphicsIpc } from './services/GraphicsSettings'

// Hardware acceleration can be switched off in Settings; Chromium only reads it at launch.
applyGraphicsChoice()

// The read-only address for an album folder the listener picks (see AlbumFolderService).
registerAlbumScheme()

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const wm = WindowManager.getInstance()
    const place = jumpPlaceFromArgv(argv)
    if (wm.isScreensaver) {
      ScreensaverSessionService.getInstance().notifyWake()
    }
    const mainWindow = wm.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      // A jump-list task: open that part of Kissa.
      if (place && !wm.isScreensaver) mainWindow.webContents.send('kissa:tray-action', `open:${place}`)
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.whenReady().then(() => {
    const isStorePackage = StorePackageService.getInstance().isStorePackage()

    // Set app user model id for windows. A Store package already has one,
    // assigned from its identity; overriding it would detach the taskbar icon.
    if (!isStorePackage) {
      electronApp.setAppUserModelId('com.namanog.kissa')
    }

    // Local record of crashes and hangs (codes only, never uploaded): see DiagnosticsLog.
    const diagnostics = DiagnosticsLog.useFile(join(app.getPath('userData'), 'diagnostics.log'))
    diagnostics.record('app-start', { version: app.getVersion(), store: isStorePackage })
    app.on('child-process-gone', (_, details) => {
      diagnostics.record('child-process-gone', {
        type: details.type,
        reason: details.reason,
        exitCode: details.exitCode
      })
    })
    app.on('render-process-gone', (_, __, details) => {
      diagnostics.record('render-process-gone', { reason: details.reason, exitCode: details.exitCode })
    })

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
      let unresponsiveSince = 0
      window.on('unresponsive', () => {
        unresponsiveSince = Date.now()
        diagnostics.record('window-unresponsive')
      })
      window.on('responsive', () => {
        if (!unresponsiveSince) return
        diagnostics.record('window-responsive', { afterMs: Date.now() - unresponsiveSince })
        unresponsiveSince = 0
      })
    })

    // Start background system media detection (Apple Music, Spotify, etc.)
    MediaDetectionService.getInstance().start()

    // Album folders the listener picks: read-only, only the files of the album read last.
    AlbumFolderService.getInstance().start()

    // The meters and the light listen to what the PC plays (measured only, never recorded).
    installLoopbackHandler(() => WindowManager.getInstance().getMainWindow()?.webContents.mainFrame)

    // Optional Apple Music activity on Discord (off until the person turns it on).
    startDiscordPresence()

    // Study sessions keep the display on (no screensaver) while they run.
    startStudyKeepAwake()

    // The phone remote (off until the person switches it on; never remembered across launches).
    setupPhoneRemote()

    // Start named pipe server for Windows screensaver supervisor coordination
    ScreensaverSessionService.getInstance().start()

    const isHidden = process.argv.includes('--hidden')
    const isScreensaver = process.argv.includes('--screensaver')
    if (!isScreensaver) WindowManager.getInstance().pendingJumpPlace = jumpPlaceFromArgv(process.argv)
    const mainWindow = WindowManager.getInstance().createMainWindow(isHidden, isScreensaver)
    // The song-change card is a window too; it must never keep Kissa alive on its own.
    mainWindow.on('closed', () => TrackToast.getInstance().destroy())
    mainWindow.on('show', () => TrackToast.getInstance().hide())
    mainWindow.on('restore', () => TrackToast.getInstance().hide())
    WindowManager.getInstance().setupIpcHandlers()
    setupGraphicsIpc()
    
    ShareManager.getInstance().init()

    TrayManager.getInstance().init()

    // Store build: keep the registered screensaver copy current across updates.
    void ScreensaverRegistryService.getInstance().refreshStoreCopyIfRegistered()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        WindowManager.getInstance().createMainWindow()
      }
    })
  })

  app.on('before-quit', () => {
    TrackToast.getInstance().destroy()
    ScreensaverSessionService.getInstance().stop()
    stopDiscordPresence()
    stopStudyKeepAwake()
    stopPhoneRemote()
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

