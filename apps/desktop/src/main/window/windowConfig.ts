import { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

/** Smallest size at which the full deck layout fits. Below this the turntable overlaps the artwork. */
export const MAIN_WINDOW_MIN_SIZE = { width: 900, height: 640 } as const

export const getWindowConfig = (): BrowserWindowConstructorOptions => ({
  width: 900,
  height: 670,
  minWidth: MAIN_WINDOW_MIN_SIZE.width,
  minHeight: MAIN_WINDOW_MIN_SIZE.height,
  show: false,
  backgroundColor: '#0f0b07',
  autoHideMenuBar: true,
  titleBarStyle: 'hidden',
  titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff' },
  // Multi-size ICO (build/generate_store_assets.py): Windows picks the frame for the display scale.
  icon: join(__dirname, '../../resources/icon.ico'),
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true
  }
})
