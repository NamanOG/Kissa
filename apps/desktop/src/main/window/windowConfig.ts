import { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
export const getWindowConfig = (): BrowserWindowConstructorOptions => ({
  width: 900,
  height: 670,
  show: false,
  autoHideMenuBar: true,
  titleBarStyle: 'hidden',
  titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff' },
  backgroundMaterial: 'mica',
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true
  }
})
