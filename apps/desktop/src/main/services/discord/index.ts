import { app, BrowserWindow, ipcMain } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { DiscordPresenceService, type PresenceSettingsStore } from './DiscordPresenceService'
import { MediaDetectionService } from '../MediaDetectionService'
import type { StudyPresence } from '../../../types/discord'

/**
 * The public Application ID of the "Kissa" application in the Discord Developer Portal.
 * It identifies the app to the local Discord client; it is not a secret, so it ships in
 * the source and every build (Store, Setup, Portable) can share. MAIN_VITE_DISCORD_APPLICATION_ID
 * overrides it for testing against another application.
 */
const KISSA_DISCORD_APPLICATION_ID = '1559921959058546758'
const DISCORD_APPLICATION_ID: string =
  (import.meta.env?.MAIN_VITE_DISCORD_APPLICATION_ID as string | undefined)?.trim() || KISSA_DISCORD_APPLICATION_ID

function settingsStore(filePath: string): PresenceSettingsStore {
  return {
    load: () => {
      try {
        const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { enabled?: unknown; shareSpotify?: unknown; shareStudy?: unknown }
        return { enabled: parsed.enabled === true, shareSpotify: parsed.shareSpotify === true, shareStudy: parsed.shareStudy !== false }
      } catch {
        return { enabled: false }
      }
    },
    save: (settings) => {
      try {
        mkdirSync(dirname(filePath), { recursive: true })
        writeFileSync(filePath, JSON.stringify({ version: 1, enabled: settings.enabled, shareSpotify: settings.shareSpotify, shareStudy: settings.shareStudy }), 'utf8')
      } catch (err) {
        console.warn('[DiscordPresence] Could not save the setting:', err)
      }
    }
  }
}

/** Only well-formed, bounded values from the window reach Discord. */
function parseStudy(value: unknown): StudyPresence | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.phase !== 'focus' && v.phase !== 'break' && v.phase !== 'paused') return null
  const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined)
  const count = (x: unknown): number | undefined => {
    const n = num(x)
    return n === undefined ? undefined : Math.min(999, Math.floor(n))
  }
  return {
    phase: v.phase,
    room: typeof v.room === 'string' ? v.room.slice(0, 40) : 'Study Room',
    endsAt: num(v.endsAt),
    startedAt: num(v.startedAt),
    round: count(v.round),
    tasksDone: count(v.tasksDone),
    tasksTotal: count(v.tasksTotal)
  }
}

let service: DiscordPresenceService | null = null

export function startDiscordPresence(): void {
  if (service) return
  service = new DiscordPresenceService({
    applicationId: DISCORD_APPLICATION_ID,
    settings: settingsStore(join(app.getPath('userData'), 'discord-presence.json'))
  })
  const presence = service

  MediaDetectionService.getInstance().onPayload((payload) => presence.onMedia(payload))
  presence.onMedia(MediaDetectionService.getInstance().getLatestPayload())

  ipcMain.handle('kissa:discord-get-status', () => presence.getStatus())
  ipcMain.handle('kissa:discord-set-enabled', (_event, enabled: unknown) => presence.setEnabled(enabled === true))
  ipcMain.handle('kissa:discord-set-share-spotify', (_event, on: unknown) => presence.setShareSpotify(on === true))
  ipcMain.handle('kissa:discord-set-share-study', (_event, on: unknown) => presence.setShareStudy(on === true))
  ipcMain.on('kissa:discord-study', (_event, study: unknown) => presence.setStudy(parseStudy(study)))
  presence.onStatusChange((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('kissa:discord-status-changed', status)
    }
  })
}

export function stopDiscordPresence(): void {
  service?.shutdown()
}
