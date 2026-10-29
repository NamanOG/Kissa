import { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

/**
 * Smallest window. Below 900 px wide the renderer switches to the compact deck (top
 * navigation, turntable above the words), so Kissa fits a Snap half of a 1366 px or
 * 125% laptop screen. Below 600 px tall the turntable moves beside the words.
 */
export const MAIN_WINDOW_MIN_SIZE = { width: 600, height: 500 } as const

export const getWindowConfig = (): BrowserWindowConstructorOptions => ({
  width: 900,
  height: 670,
  minWidth: MAIN_WINDOW_MIN_SIZE.width,
  minHeight: MAIN_WINDOW_MIN_SIZE.height,
  show: false,
  backgroundColor: '#0b0a09',
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
