import { app, BrowserWindow, ipcMain, net } from 'electron'
import { readFileSync } from 'fs'
import { execFile } from 'child_process'
import { createRequire } from 'module'
import { join } from 'path'
import { MediaDetectionService } from '../MediaDetectionService'
import { WindowManager } from '../../window/WindowManager'
import { PhoneRemoteService } from './PhoneRemoteService'
import { PHONE_FONT_FILES } from './phonePage'
import type { PhoneRemoteStatus } from '../../../types/remote'

const VOLUME_POLL_MS = 1500

let remote: PhoneRemoteService | null = null
const fonts = new Map<string, Buffer | null>()

function readFont(name: string): Buffer | null {
  if (fonts.has(name)) return fonts.get(name) ?? null
  let bytes: Buffer | null = null
  const id = PHONE_FONT_FILES[name]
  if (id) {
    try {
      bytes = readFileSync(createRequire(join(app.getAppPath(), 'package.json')).resolve(id))
    } catch {
      bytes = null
    }
  }
  fonts.set(name, bytes)
  return bytes
}
let volumePoll: ReturnType<typeof setInterval> | null = null

/**
 * Wires the phone remote to the window: the window sends what is playing, and runs the
 * phone's play, pause and skip exactly as its own buttons do. The PC's volume is set here,
 * through the media helper. Nothing listens until the person switches the remote on.
 */
export function setupPhoneRemote(): void {
  if (remote) return
  const media = MediaDetectionService.getInstance()
  const service = new PhoneRemoteService({
    onCommand: (command) =>
      WindowManager.getInstance()
        .getMainWindow()
        ?.webContents.send('kissa:remote-command', command),
    onVolume: (level) => media.setVolume(level),
    font: readFont,
    fetchArt
  })
  remote = service

  const readVolume = (): void => {
    const v = media.getVolume()
    service.setVolume(v ? (v.isMuted ? 0 : v.master) : null)
  }
  service.onStatus((status: PhoneRemoteStatus) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('kissa:remote-status-changed', status)
    }
    // Only follow the PC's volume while a phone is there to show it.
    if (status.phones > 0 && !volumePoll) {
      readVolume()
      volumePoll = setInterval(readVolume, VOLUME_POLL_MS)
      volumePoll.unref?.()
    } else if (status.phones === 0 && volumePoll) {
      clearInterval(volumePoll)
      volumePoll = null
    }
  })

  ipcMain.handle('kissa:remote-status', () => service.getStatus())
  ipcMain.handle('kissa:remote-set-on', async (_event, on: unknown) => {
    if (on !== true) return service.stop()
    const status = await service.start()
    if (status.on) checkNetworkCategory(service)
    return service.getStatus()
  })
  ipcMain.on('kissa:remote-now-playing', (_event, snapshot: unknown) =>
    service.setNowPlaying(snapshot)
  )
  ipcMain.on('kissa:remote-queue', (event, snapshot: unknown) => {
    if (event.sender === WindowManager.getInstance().getMainWindow()?.webContents)
      service.setQueue(snapshot)
  })
  ipcMain.on('kissa:remote-look', (event, look: unknown) => {
    if (event.sender === WindowManager.getInstance().getMainWindow()?.webContents)
      service.setLook(look)
  })
  ipcMain.on('kissa:remote-lyrics', (_event, track: unknown, lines: unknown) => {
    if (track && typeof track === 'object')
      service.setLyrics(track as { title?: unknown; artist?: unknown }, lines)
  })
}

/** A web cover for the phone, fetched once per track (same covers the window already shows). */
async function fetchArt(url: string): Promise<{ type: string; bytes: Buffer } | null> {
  if (!url.startsWith('https://')) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await net.fetch(url, { signal: controller.signal })
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!res.ok || !type.startsWith('image/')) return null
    return { type, bytes: Buffer.from(await res.arrayBuffer()) }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Windows blocks incoming connections on a network it calls Public, so a phone cannot reach
 * Kissa however the remote is set. Ask Windows once per switch-on (read only) so the card can say so.
 */
function checkNetworkCategory(service: PhoneRemoteService): void {
  if (process.platform !== 'win32') return
  execFile(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '(Get-NetConnectionProfile | Select-Object -ExpandProperty NetworkCategory) -join ","'
    ],
    { timeout: 8000, windowsHide: true },
    (err, stdout) => {
      if (err) return
      const categories = String(stdout)
        .trim()
        .split(',')
        .map((c) => c.trim())
      service.setPublicNetwork(
        categories.includes('Public') &&
          !categories.includes('Private') &&
          !categories.includes('DomainAuthenticated')
      )
    }
  )
}

export function stopPhoneRemote(): void {
  if (volumePoll) clearInterval(volumePoll)
  volumePoll = null
  remote?.stop()
}
