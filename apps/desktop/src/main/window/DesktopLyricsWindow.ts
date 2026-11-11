import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { join } from 'path'
import { WindowManager } from './WindowManager'
import {
  DESKTOP_LYRICS_SIZES,
  placeDesktopLyrics,
  readDesktopLyrics,
  sanitizeDesktopLyricsFrame,
  writeDesktopLyrics,
  type StoredDesktopLyrics
} from './desktopLyricsState'
import { desktopLyricsPage } from './desktopLyricsPage'
import type { DesktopLyricsFrame, DesktopLyricsSize, DesktopLyricsStatus } from '../../types/desktopLyrics'

/**
 * Desktop lyrics: the line being sung, large, with the next one smaller beneath it, floating
 * over the desktop in a transparent always-on-top window. Plain text with a soft shadow, no
 * blur, so it costs almost nothing to draw. The page is self-contained HTML with no preload
 * (like the song-change card); it is told what to show through window.render and reports
 * clicks by navigating to kissa.invalid addresses, which are caught here and never loaded.
 *
 * Unlocked, the window can be dragged and shows its controls. Locked, clicks pass through to
 * whatever is underneath; moving the pointer over it shows the controls, and only the
 * controls take clicks.
 */
const SHORTCUT = 'Control+Alt+L'
const ACTION = 'https://kissa.invalid/dl/'
const FADE_MS = 520

export interface DesktopLyricsLabels {
  lock: string
  unlock: string
  close: string
  size: string
}

const EN_LABELS: DesktopLyricsLabels = {
  lock: 'Lock in place',
  unlock: 'Unlock to move',
  close: 'Turn off desktop lyrics',
  size: 'Text size'
}

const PAGE = desktopLyricsPage(ACTION)

export class DesktopLyricsWindow {
  private static instance: DesktopLyricsWindow
  private win: BrowserWindow | null = null
  private ready: Promise<void> | null = null
  private state: StoredDesktopLyrics = readDesktopLyrics(this.file())
  private frame: DesktopLyricsFrame = { visible: false, current: '', next: '' }
  private labels: DesktopLyricsLabels = EN_LABELS
  private shortcutOk = false
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  public static getInstance(): DesktopLyricsWindow {
    if (!DesktopLyricsWindow.instance) DesktopLyricsWindow.instance = new DesktopLyricsWindow()
    return DesktopLyricsWindow.instance
  }

  private file(): string {
    return join(app.getPath('userData'), 'desktop-lyrics.json')
  }

  public status(): DesktopLyricsStatus {
    return {
      enabled: this.state.enabled,
      locked: this.state.locked,
      size: this.state.size,
      shortcut: this.shortcutOk
    }
  }

  /** IPC and the global shortcut. Not called for the screensaver. */
  public setup(): void {
    try {
      this.shortcutOk = globalShortcut.register(SHORTCUT, () => this.setEnabled(!this.state.enabled))
    } catch {
      // Another app owns the keys, or the system refused: the toggles in Kissa still work.
      this.shortcutOk = false
    }

    ipcMain.handle('kissa:desktop-lyrics-status', () => this.status())
    ipcMain.handle('kissa:desktop-lyrics-set', (_e, change: unknown) => {
      const c = (change && typeof change === 'object' ? change : {}) as Record<string, unknown>
      if (typeof c.enabled === 'boolean') this.setEnabled(c.enabled)
      if (typeof c.locked === 'boolean') this.setLocked(c.locked)
      if (c.size === 's' || c.size === 'm' || c.size === 'l') this.setSize(c.size)
      return this.status()
    })
    ipcMain.on('kissa:desktop-lyrics-frame', (_e, raw: unknown) => this.applyFrame(sanitizeDesktopLyricsFrame(raw)))
    ipcMain.on('kissa:desktop-lyrics-labels', (_e, raw: unknown) => {
      const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
      const text = (v: unknown, fallback: string): string =>
        typeof v === 'string' && v.trim() ? v.slice(0, 80) : fallback
      this.labels = {
        lock: text(r.lock, EN_LABELS.lock),
        unlock: text(r.unlock, EN_LABELS.unlock),
        close: text(r.close, EN_LABELS.close),
        size: text(r.size, EN_LABELS.size)
      }
      this.configure()
    })

    const replace = (): void => this.place()
    screen.on('display-removed', replace)
    screen.on('display-metrics-changed', replace)
  }

  private broadcast(): void {
    const main = WindowManager.getInstance().getMainWindow()
    if (main && !main.isDestroyed()) main.webContents.send('kissa:desktop-lyrics-changed', this.status())
  }

  private save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => void writeDesktopLyrics(this.file(), this.state), 400)
  }

  public setEnabled(on: boolean): void {
    if (this.state.enabled === on) return
    this.state = { ...this.state, enabled: on }
    this.save()
    if (on) this.applyFrame(this.frame)
    else this.closeWindow()
    this.broadcast()
  }

  private setLocked(on: boolean): void {
    if (this.state.locked === on) return
    this.state = { ...this.state, locked: on }
    this.save()
    this.applyLock()
    this.configure()
    this.broadcast()
  }

  private setSize(size: DesktopLyricsSize): void {
    if (this.state.size === size) return
    // Keep the middle of the bottom edge where it was, so the words stay where the eye is.
    const win = this.live()
    if (win) {
      const b = win.getBounds()
      const next = DESKTOP_LYRICS_SIZES[size]
      this.state = {
        ...this.state,
        x: Math.round(b.x + b.width / 2 - next.width / 2),
        y: b.y + b.height - next.height
      }
    }
    this.state = { ...this.state, size }
    this.save()
    this.place()
    this.configure()
    this.broadcast()
  }

  private live(): BrowserWindow | null {
    return this.win && !this.win.isDestroyed() ? this.win : null
  }

  /** Kissa itself fills the screen, is the screensaver, or is gone: the words step aside. */
  private blocked(): boolean {
    const wm = WindowManager.getInstance()
    if (wm.isScreensaver) return true
    const main = wm.getMainWindow()
    return !main || main.isDestroyed() || main.isFullScreen()
  }

  public applyFrame(frame: DesktopLyricsFrame): void {
    this.frame = frame
    if (!this.state.enabled) return
    const show = frame.visible && !this.blocked()
    if (show) {
      if (this.hideTimer) clearTimeout(this.hideTimer)
      this.hideTimer = null
      void this.ensureWindow().then(() => {
        const win = this.live()
        if (!win || !this.state.enabled) return
        this.render(this.frame)
        if (this.frame.visible && !this.blocked() && !win.isVisible()) win.showInactive()
      })
      return
    }
    const win = this.live()
    if (!win || !win.isVisible()) return
    // Fade the words, then take the window away so an invisible window never catches clicks.
    this.render({ ...frame, visible: false })
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      const w = this.live()
      if (w && !this.frame.visible) w.hide()
    }, FADE_MS)
  }

  /** Kissa went full screen or came back: re-check without a new frame. */
  public refresh(): void {
    this.applyFrame(this.frame)
  }

  private render(frame: DesktopLyricsFrame): void {
    const win = this.live()
    if (!win) return
    win.webContents.executeJavaScript(`window.render(${JSON.stringify(frame)})`).catch(() => undefined)
  }

  private configure(): void {
    const win = this.live()
    if (!win) return
    const config = { locked: this.state.locked, size: this.state.size, labels: this.labels }
    win.webContents.executeJavaScript(`window.configure(${JSON.stringify(config)})`).catch(() => undefined)
  }

  private applyLock(): void {
    const win = this.live()
    if (!win) return
    win.setIgnoreMouseEvents(this.state.locked, this.state.locked ? { forward: true } : undefined)
    win.setFocusable(!this.state.locked)
  }

  private place(): void {
    const win = this.live()
    if (!win) return
    const displays = screen.getAllDisplays().map((d) => ({ id: d.id, workArea: d.workArea }))
    win.setBounds(placeDesktopLyrics(this.state, displays, screen.getPrimaryDisplay().workArea))
  }

  private ensureWindow(): Promise<void> {
    if (this.live() && this.ready) return this.ready
    const { width, height } = DESKTOP_LYRICS_SIZES[this.state.size]
    const win = new BrowserWindow({
      width,
      height,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: !this.state.locked,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      thickFrame: false,
      backgroundColor: '#00000000',
      title: 'Kissa desktop lyrics',
      webPreferences: { sandbox: true, contextIsolation: true, javascript: true, spellcheck: false }
    })
    win.setAlwaysOnTop(true, 'pop-up-menu')
    win.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      if (url.startsWith(ACTION)) this.onAction(url.slice(ACTION.length))
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.on('moved', () => {
      const b = win.getBounds()
      this.state = { ...this.state, x: b.x, y: b.y, displayId: screen.getDisplayMatching(b).id }
      this.save()
    })
    win.on('closed', () => {
      if (this.win === win) {
        this.win = null
        this.ready = null
      }
    })
    this.win = win
    this.place()
    this.applyLock()
    this.ready = win
      .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`)
      .then(() => this.configure())
      .catch(() => undefined)
    return this.ready
  }

  private onAction(action: string): void {
    const win = this.live()
    if (action === 'lock') this.setLocked(true)
    else if (action === 'unlock') this.setLocked(false)
    else if (action === 'close') this.setEnabled(false)
    else if (action.startsWith('size/')) {
      const size = action.slice(5)
      if (size === 's' || size === 'm' || size === 'l') this.setSize(size)
    } else if (win && this.state.locked && (action === 'hover/on' || action === 'hover/off')) {
      // Only the controls take clicks while locked; everything else passes through.
      const on = action === 'hover/on'
      win.setIgnoreMouseEvents(!on, on ? undefined : { forward: true })
    }
  }

  /** The main window closed: the words go with it (the shortcut stays for a new window). */
  public closeWindow(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = null
    const win = this.live()
    if (win) win.destroy()
    this.win = null
    this.ready = null
  }

  /** Quit, or the main window closed: nothing may keep Kissa alive. */
  public destroy(): void {
    this.closeWindow()
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
      void writeDesktopLyrics(this.file(), this.state)
    }
    if (this.shortcutOk) {
      try {
        globalShortcut.unregister(SHORTCUT)
      } catch {
        /* already gone */
      }
      this.shortcutOk = false
    }
  }
}
