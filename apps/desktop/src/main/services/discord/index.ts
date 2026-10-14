import { app, BrowserWindow, ipcMain } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { DiscordPresenceService, type PresenceSettingsStore } from './DiscordPresenceService'
import { MediaDetectionService } from '../MediaDetectionService'

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
        const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as { enabled?: unknown; shareSpotify?: unknown }
        return { enabled: parsed.enabled === true, shareSpotify: parsed.shareSpotify === true }
      } catch {
        return { enabled: false }
      }
    },
    save: (settings) => {
      try {
        mkdirSync(dirname(filePath), { recursive: true })
        writeFileSync(filePath, JSON.stringify({ version: 1, enabled: settings.enabled, shareSpotify: settings.shareSpotify }), 'utf8')
      } catch (err) {
        console.warn('[DiscordPresence] Could not save the setting:', err)
      }
    }
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
  presence.onStatusChange((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('kissa:discord-status-changed', status)
    }
  })
}

export function stopDiscordPresence(): void {
  service?.shutdown()
}
