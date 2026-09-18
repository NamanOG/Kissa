import { BrowserWindow, shell, app } from 'electron'
import { WindowManager } from './WindowManager'
import { ScreensaverSessionService } from '../services/ScreensaverSessionService'

export function attachFullscreenEventSync(
  window: Pick<BrowserWindow, 'isDestroyed' | 'on' | 'webContents'>
): void {
  window.on('enter-full-screen', () => {
    if (!window.isDestroyed()) {
      window.webContents.send('kissa:fullscreen-changed', true)
    }
  })

  window.on('leave-full-screen', () => {
    if (!window.isDestroyed()) {
      window.webContents.send('kissa:fullscreen-changed', false)
    }
  })
}

export function setupWindowEvents(window: BrowserWindow, isHidden: boolean = false): void {
  window.on('ready-to-show', () => {
    if (!isHidden) {
      window.show()
    }
  })

  // Fallback in case ready-to-show was already fired
  if (!window.isVisible() && !isHidden) {
    setTimeout(() => {
      if (!window.isDestroyed() && !window.isVisible()) {
        window.show()
      }
    }, 500)
  }

  window.webContents.setWindowOpenHandler((details) => {
    if (details.url && (details.url.startsWith('https://') || details.url.startsWith('http://'))) { shell.openExternal(details.url) }
    return { action: 'deny' }
  })

  attachFullscreenEventSync(window)

  window.on('close', (event) => {
    const wm = WindowManager.getInstance()
    // During screensaver mode, exit screensaver instead of hiding or closing.
    // Without this, Alt+F4 would hide the window while Kissa.scr keeps the pipe alive,
    // producing a permanent blank-screen lockout that the user cannot escape.
    if (wm.isScreensaver) {
      event.preventDefault()
      ScreensaverSessionService.getInstance().notifyWake()
      return
    }
    if (wm.isBackgroundEnabled && !wm.isQuitting) {
      event.preventDefault()
      window.hide()
    }
  })
}
