import { BrowserWindow, app, screen } from 'electron'
import { join } from 'path'
import { getWindowConfig, MAIN_WINDOW_MIN_SIZE } from './windowConfig'
import { setupWindowEvents } from './windowEvents'
import { readWindowState, resolveInitialBounds, writeWindowState } from './windowState'
import { TrackToast, sanitizeToastPayload } from './TrackToast'
import { buildJumpTasks, type JumpLabels, type JumpPlace } from './jumpList'
import { getPlayIcon, getPauseIcon, getPrevIcon, getNextIcon } from './icons'
import { ScreensaverRegistryService } from '../services/ScreensaverRegistryService'
import { UpdateService } from '../services/UpdateService'
import { ScreensaverSessionService } from '../services/ScreensaverSessionService'
import { MediaDetectionService } from '../services/MediaDetectionService'
import { StorePackageService } from '../services/StorePackageService'
import { AlbumSidesService } from '../services/AlbumSidesService'

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
  /** True while the window is shrunk to the mini player; that size is never remembered. */
  public isMiniPlayer: boolean = false
  /** A jump-list task Kissa was started with, kept until the renderer is ready for it. */
  public pendingJumpPlace: JumpPlace | null = null
  private constructor() {}

  private windowStateFile(): string {
    return join(app.getPath('userData'), 'window-state.json')
  }

  /** Where the window opens: last place it was, or a size that suits this screen. */
  private initialPlacement(): { bounds: Electron.Rectangle; maximized: boolean } | null {
    try {
      const saved = readWindowState(this.windowStateFile())
      const displays = screen.getAllDisplays().map((d) => d.workArea)
      const primary = screen.getPrimaryDisplay().workArea
      return resolveInitialBounds(saved, displays, primary, MAIN_WINDOW_MIN_SIZE)
    } catch {
      return null
    }
  }

  /** Remembers the window's normal size and position, never screensaver or mini-player geometry. */
  private rememberWindowState(win: BrowserWindow): void {
    if (win.isDestroyed() || this.isScreensaver || this.isMiniPlayer || win.isMinimized() || win.isFullScreen()) return
    void writeWindowState(this.windowStateFile(), {
      version: 1,
      bounds: win.getNormalBounds(),
      maximized: win.isMaximized()
    })
  }

  private trackWindowState(win: BrowserWindow): void {
    let timer: ReturnType<typeof setTimeout> | null = null
    const later = (): void => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => this.rememberWindowState(win), 600)
    }
    for (const event of ['resize', 'move', 'maximize', 'unmaximize'] as const) {
      win.on(event as 'resize', later)
    }
    win.on('close', () => {
      if (timer) clearTimeout(timer)
      this.rememberWindowState(win)
    })
  }
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
    const placement = isScreensaver ? null : this.initialPlacement()
    const config = isScreensaver
      ? { ...baseConfig, fullscreen: true, autoHideMenuBar: true }
      : placement
        ? { ...baseConfig, ...placement.bounds }
        : baseConfig

    this.mainWindow = new BrowserWindow(config)
    if (placement?.maximized) {
      // maximize() shows a hidden window, so wait until it is due to appear anyway
      // (startup with --hidden opens to the tray and maximizes when first shown).
      const win = this.mainWindow
      const maximize = (): void => {
        if (!win.isDestroyed()) win.maximize()
      }
      if (isHidden) win.once('show', maximize)
      else win.once('ready-to-show', maximize)
    }
    if (!isScreensaver) this.trackWindowState(this.mainWindow)
    // Keep the renderer alive and responsive even when Kissa is hidden in the tray.
    // Without this, a throttled renderer may miss IPC events (e.g. screensaver activation)
    // and show a blank screen with no way to recover.
    this.mainWindow.webContents.setBackgroundThrottling(false)
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

    // Always bring the window to a visible, focused state before going fullscreen.
    // If the window was minimized or hidden (tray mode), restore/show it first.
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
    }

    this.mainWindow.setFullScreen(true)
    this.mainWindow.setAlwaysOnTop?.(true, 'screen-saver')
    this.mainWindow.focus()
    this.mainWindow.webContents?.focus?.()

    this.mainWindow.webContents.send('kissa:screensaver-mode-changed', true)

    import('electron').then(({ globalShortcut }) => {
      try {
        globalShortcut.register('Escape', () => {
          ScreensaverSessionService.getInstance().notifyWake()
        })
      } catch {
      }
    })
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

    import('electron').then(({ globalShortcut }) => {
      try {
        if (globalShortcut.isRegistered('Escape')) {
          globalShortcut.unregister('Escape')
        }
      } catch {
      }
    })

    this.mainWindow.webContents.send('kissa:screensaver-mode-changed', false)

    if (saved) {
      if (!saved.isFullScreen && this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(false)
      }

      this.mainWindow.setAlwaysOnTop?.(false)

      if (saved.isMaximized) {
        this.mainWindow.maximize()
      } else if (saved.bounds) {
        this.mainWindow.setBounds(saved.bounds)
      }

      // Don't restore the minimized or hidden state. The user just woke the machine, so the
      // window has to end up visible and focused; re-hiding it to the tray would leave a blank
      // screen with no way back.
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show()
      }
      this.mainWindow.focus()
    } else {
      if (this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(false)
      }
      this.mainWindow.setAlwaysOnTop?.(false)
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show()
      }
      this.mainWindow.focus()
    }
  }

  public setupIpcHandlers(): void {
    import('electron').then(({ ipcMain, app }) => {
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

      // Where the full window was before it shrank to the mini player.
      let beforeMini: { maximized: boolean; bounds: Electron.Rectangle } | null = null

      // The mini player shows only the record until the pointer is over it. The whole window is
      // a drag area, and Windows keeps mouse events over drag areas from the page, so the
      // cursor is watched from here instead, a few times a second and only while it is small.
      let miniHoverTimer: ReturnType<typeof setInterval> | null = null
      let miniHover = false
      const stopMiniHover = (): void => {
        if (miniHoverTimer) clearInterval(miniHoverTimer)
        miniHoverTimer = null
        miniHover = false
      }
      const startMiniHover = (): void => {
        stopMiniHover()
        miniHoverTimer = setInterval(() => {
          const w = this.mainWindow
          if (!w || w.isDestroyed()) return stopMiniHover()
          if (!w.isVisible() || w.isMinimized()) return
          const p = screen.getCursorScreenPoint()
          const b = w.getBounds()
          const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height
          if (inside === miniHover) return
          miniHover = inside
          w.webContents.send('kissa:mini-hover', inside)
        }, 120)
      }

      ipcMain.handle('kissa:toggle-mini-player', (_event, isMini: boolean, alwaysOnTop: boolean = true) => {
        const win = this.mainWindow
        if (!win) return
        if (isMini) {
          this.isMiniPlayer = true
          if (win.isFullScreen()) win.setFullScreen(false)
          // A maximized window ignores setSize, so remember the state and un-maximize first.
          if (!beforeMini) beforeMini = { maximized: win.isMaximized(), bounds: win.getNormalBounds() }
          if (win.isMaximized()) win.unmaximize()
          win.setMinimumSize(320, 320)
          win.setSize(360, 420, true)
          win.setAlwaysOnTop(alwaysOnTop)
          startMiniHover()
        } else {
          stopMiniHover()
          win.setAlwaysOnTop(false)
          win.setMinimumSize(MAIN_WINDOW_MIN_SIZE.width, MAIN_WINDOW_MIN_SIZE.height)
          if (beforeMini) {
            win.setBounds(beforeMini.bounds)
            if (beforeMini.maximized) win.maximize()
          } else {
            win.setSize(900, 670, true)
          }
          beforeMini = null
          this.isMiniPlayer = false
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
      
      // Song changed while Kissa is out of sight: a small card in the corner, never focused.
      ipcMain.handle('kissa:show-track-toast', (_event, raw: unknown) => {
        const win = this.mainWindow
        if (!win || win.isDestroyed() || this.isScreensaver) return false
        if (win.isVisible() && !win.isMinimized()) return false
        const payload = sanitizeToastPayload(raw)
        if (!payload) return false
        void TrackToast.getInstance().show(payload)
        return true
      })

      // Sides: an album's track list split into the record's sides (MusicBrainz, cached).
      ipcMain.handle('kissa:album-sides', (_event, artist: unknown, album: unknown) => {
        if (typeof artist !== 'string' || typeof album !== 'string') return null
        if (!artist.trim() || !album.trim() || artist.length > 300 || album.length > 300) return null
        return AlbumSidesService.getInstance()
          .getSides(artist, album)
          .catch(() => null)
      })

      ipcMain.handle('kissa:take-jump-place', () => {
        const place = this.pendingJumpPlace
        this.pendingJumpPlace = null
        return place
      })

      // Labels come from the renderer so the jump list speaks the listener's language.
      ipcMain.handle('kissa:set-jump-list', (_event, labels: JumpLabels) => {
        // A development run is electron.exe without the app path, so its tasks would open an empty Electron.
        if (process.platform !== 'win32' || !app.isPackaged) return
        try {
          app.setUserTasks(buildJumpTasks(process.execPath, labels && typeof labels === 'object' ? labels : {}))
        } catch {
        }
      })

      ipcMain.handle('kissa:set-startup', async (_event, enabled: boolean) => {
        const store = StorePackageService.getInstance()
        if (store.isStorePackage()) {
          // A Store package starts at sign-in through the StartupTask declared in
          // its manifest; the Run registry key Electron writes is redirected and
          // would have no effect.
          await store.setStartupTask(Boolean(enabled))
          return
        }

        app.setLoginItemSettings({
          openAtLogin: enabled,
          args: ['--hidden']
        })
      })
    })
  }
}
