import { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

export const getWindowConfig = (): BrowserWindowConstructorOptions => ({
  width: 900,
  height: 670,
  show: false,
  backgroundColor: '#0f0b07',
  autoHideMenuBar: true,
  titleBarStyle: 'hidden',
  titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff' },
  icon: join(__dirname, '../../resources/icon.png'),
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true
  }
})
