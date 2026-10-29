import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Hardware acceleration. On by default (Chromium draws with the GPU, which is what keeps the
 * record and the light smooth). A few PCs have graphics drivers that flicker, show black
 * windows or stutter with it, so it can be switched off in Settings. Chromium reads it once at
 * launch, so the choice is kept in a small file in userData, read before the app is ready, and
 * applies the next time Kissa starts.
 */

export interface GraphicsStatus {
  /** What is saved for the next launch. */
  hardwareAcceleration: boolean
  /** What this run actually uses. */
  activeNow: boolean
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'graphics.json')
}

export function readHardwareAcceleration(file = settingsFile()): boolean {
  try {
    if (!existsSync(file)) return true
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { hardwareAcceleration?: unknown }
    return parsed.hardwareAcceleration !== false
  } catch {
    return true
  }
}

let activeNow = true

/** Call before app.whenReady(): turns the GPU off for this run when the person chose so. */
export function applyGraphicsChoice(): void {
  if (!readHardwareAcceleration()) {
    app.disableHardwareAcceleration()
    activeNow = false
  }
}

export function setupGraphicsIpc(): void {
  ipcMain.handle('kissa:get-graphics', (): GraphicsStatus => ({
    hardwareAcceleration: readHardwareAcceleration(),
    activeNow
  }))

  ipcMain.handle('kissa:set-graphics', (_event, on: unknown): GraphicsStatus => {
    const file = settingsFile()
    try {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify({ hardwareAcceleration: on !== false }))
    } catch {
      // Unwritable profile: the saved value below shows what stuck.
    }
    return { hardwareAcceleration: readHardwareAcceleration(file), activeNow }
  })

  ipcMain.handle('kissa:relaunch', () => {
    app.relaunch()
    app.exit(0)
  })
}
