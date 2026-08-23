import { BrowserWindow, shell } from 'electron'

export function setupWindowEvents(window: BrowserWindow): void {
  window.on('ready-to-show', () => {
    window.show()
  })

  // Fallback in case ready-to-show was already fired
  if (!window.isVisible()) {
    setTimeout(() => {
      if (!window.isDestroyed() && !window.isVisible()) {
        window.show()
      }
    }, 500)
  }

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}
