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

/**
 * Tells the page whether its window can be seen. Minimising, or hiding to the tray, leaves
 * document.hidden false on Windows, so the page would otherwise keep drawing purely visual
 * work (Moving light) that nobody can see. Only visual work listens to this: playback, media
 * detection and the Study clock keep running.
 */
export function attachVisibilityEventSync(
  window: Pick<BrowserWindow, 'isDestroyed' | 'on' | 'webContents' | 'isVisible' | 'isMinimized'>
): void {
  const send = (): void => {
    if (window.isDestroyed()) return
    window.webContents.send('kissa:window-visibility', window.isVisible() && !window.isMinimized())
  }
  // 'focus' is a safety net: a window brought back by something other than win.show() (for
  // example another program) emits no 'show', but it does take focus when the user reaches it.
  for (const event of ['minimize', 'restore', 'hide', 'show', 'maximize', 'unmaximize', 'focus'] as const) {
    window.on(event as 'minimize', send)
  }
  // A reloaded page (or one that loaded while hidden in the tray) learns the current state.
  window.webContents.on('did-finish-load', send)
}

export function setupWindowEvents(window: BrowserWindow, isHidden: boolean = false): void {
  // The window is revealed by WindowManager once its first frame (the opening) has painted:
  // never earlier, so it is never seen blank. A long safety net covers a page that never paints.
  if (!isHidden) {
    setTimeout(() => {
      if (!window.isDestroyed() && !window.isVisible()) window.show()
    }, 12_000)
  }

  window.webContents.setWindowOpenHandler((details) => {
    if (details.url && (details.url.startsWith('https://') || details.url.startsWith('http://'))) { shell.openExternal(details.url) }
    return { action: 'deny' }
  })

  attachFullscreenEventSync(window)
  attachVisibilityEventSync(window)
  attachMaximizeEventSync(window)

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

export type WindowControl = 'minimize' | 'toggle-maximize' | 'close'

/**
 * Kissa draws its own caption buttons (no native overlay), so the page asks the window to
 * minimise, maximise or restore, or close. Close goes through the window's normal close path, so
 * "run in the background" and the screensaver guard still apply.
 */
export function applyWindowControl(
  window: Pick<BrowserWindow, 'isDestroyed' | 'minimize' | 'isMaximized' | 'maximize' | 'unmaximize' | 'close'> | null,
  action: unknown
): void {
  if (!window || window.isDestroyed()) return
  if (action === 'minimize') window.minimize()
  else if (action === 'toggle-maximize') {
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  } else if (action === 'close') window.close()
}

/** Tells the page whether its window is maximised, so the caption button shows Restore. */
export function attachMaximizeEventSync(
  window: Pick<BrowserWindow, 'isDestroyed' | 'on' | 'webContents' | 'isMaximized'>
): void {
  const send = (): void => {
    if (window.isDestroyed()) return
    window.webContents.send('kissa:window-maximized', window.isMaximized())
  }
  for (const event of ['maximize', 'unmaximize', 'restore'] as const) window.on(event as 'maximize', send)
  window.webContents.on('did-finish-load', send)
}