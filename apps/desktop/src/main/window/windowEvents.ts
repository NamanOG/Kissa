import { BrowserWindow } from 'electron'
export function setupWindowEvents(window: BrowserWindow): void {
  window.on('ready-to-show', () => {
    window.show()
  })
  window.webContents.setWindowOpenHandler((details) => {
    require('electron').shell.openExternal(details.url)
    return { action: 'deny' }
  })
}
