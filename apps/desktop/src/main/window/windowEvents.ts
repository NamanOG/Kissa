import { BrowserWindow, shell, app } from 'electron'
import { WindowManager } from './WindowManager'

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
    if (wm.isBackgroundEnabled && !wm.isQuitting) {
      event.preventDefault()
      window.hide()
    }
  })
}
