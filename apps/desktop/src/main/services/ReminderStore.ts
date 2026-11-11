import { app, ipcMain } from 'electron'
import { readFileSync, promises as fs } from 'fs'
import { join } from 'path'
import { arch, release, version } from 'os'
import { freshReminders, sanitizeReminders, type ReminderState } from '../../types/reminders'

/**
 * Where Kissa keeps its rating and support reminder answers: userData/reminders.json, beside
 * desktop-lyrics.json, so an answer survives clearing the app's web storage. The renderer decides
 * when to ask (types/reminders.ts); this only reads and writes, sanitising both ways.
 */
export class ReminderStore {
  private static instance: ReminderStore
  private state: ReminderState | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  public static getInstance(): ReminderStore {
    if (!ReminderStore.instance) ReminderStore.instance = new ReminderStore()
    return ReminderStore.instance
  }

  private file(): string {
    return join(app.getPath('userData'), 'reminders.json')
  }

  /** Null when nothing has been stored yet, so the renderer can carry over an older answer. */
  private read(): ReminderState | null {
    if (this.state) return this.state
    try {
      this.state = sanitizeReminders(JSON.parse(readFileSync(this.file(), 'utf8')))
    } catch {
      return null
    }
    return this.state
  }

  private write(next: ReminderState): void {
    this.state = next
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(async () => {
      const file = this.file()
      const tmp = `${file}.tmp`
      try {
        await fs.writeFile(tmp, JSON.stringify(next), 'utf8')
        await fs.rename(tmp, file)
      } catch {
        // A lost answer only means the card may come back once.
      }
    }, 200)
  }

  public setup(): void {
    ipcMain.handle('kissa:reminders-get', () => this.read())
    ipcMain.handle('kissa:reminders-set', (_e, raw: unknown) => {
      const next = sanitizeReminders(raw ?? freshReminders())
      this.write(next)
      return next
    })
    // For "Report a bug": the Windows version and architecture, nothing that identifies the person.
    ipcMain.handle('kissa:system-info', () => {
      let windows = ''
      try {
        windows = `${version()} (${release()})`
      } catch {
        windows = release()
      }
      return { windows: windows.slice(0, 80), arch: arch() }
    })
  }
}
