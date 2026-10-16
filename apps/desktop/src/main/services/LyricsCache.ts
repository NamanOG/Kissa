import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { LyricsResponse } from '../../types/lyrics'

/**
 * Lyrics already found for a recording, kept on disk so a restart (or a track played
 * again tomorrow) shows them at once without asking LRCLIB again.
 *
 * Only answers worth keeping are stored: timed, plain and instrumental results. Misses
 * and failures are never written, so a song added to LRCLIB later is still picked up.
 */

const SCHEMA_VERSION = 1
const DAY_MS = 24 * 60 * 60 * 1000
/** Timed lyrics rarely change once published. */
const SYNCED_TTL_MS = 90 * DAY_MS
/** Plain or instrumental answers may gain timing or be corrected, so look again sooner. */
const UNTIMED_TTL_MS = 7 * DAY_MS
const WRITE_DELAY_MS = 2_000

interface CacheEntry {
  value: LyricsResponse
  savedAt: number
  usedAt: number
}

interface CacheFile {
  version: number
  entries: Record<string, CacheEntry>
}

export interface LyricsCacheBackend {
  read(): string | null
  write(data: string): void
}

export function createFileBackend(filePath: string): LyricsCacheBackend {
  return {
    read: () => {
      try {
        return readFileSync(filePath, 'utf8')
      } catch {
        return null
      }
    },
    write: (data) => {
      mkdirSync(dirname(filePath), { recursive: true })
      const tmp = `${filePath}.tmp`
      writeFileSync(tmp, data, 'utf8')
      renameSync(tmp, filePath)
    }
  }
}

export class LyricsCache {
  private entries: Map<string, CacheEntry> | null = null
  private writeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly backend: LyricsCacheBackend | null,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 300
  ) {}

  public get(key: string): LyricsResponse | null {
    const entries = this.load()
    const entry = entries.get(key)
    if (!entry) return null
    const ttl = entry.value.status === 'synced' ? SYNCED_TTL_MS : UNTIMED_TTL_MS
    if (this.now() - entry.savedAt > ttl) {
      entries.delete(key)
      this.scheduleWrite()
      return null
    }
    entry.usedAt = this.now()
    return entry.value
  }

  public set(key: string, value: LyricsResponse): void {
    if (value.status !== 'synced' && value.status !== 'plain' && value.status !== 'instrumental')
      return
    const entries = this.load()
    const at = this.now()
    entries.set(key, { value, savedAt: at, usedAt: at })
    if (entries.size > this.maxEntries) {
      // Drop the least recently shown recordings.
      const oldest = [...entries.entries()].sort((a, b) => a[1].usedAt - b[1].usedAt)
      for (const [k] of oldest.slice(0, entries.size - this.maxEntries)) entries.delete(k)
    }
    this.scheduleWrite()
  }

  public clear(): void {
    this.entries = new Map()
    this.flush()
  }

  public delete(key: string): void {
    this.load().delete(key)
    this.scheduleWrite()
  }

  /** Write any pending change now (used on quit). */
  public flush(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer)
      this.writeTimer = null
    }
    if (!this.backend || !this.entries) return
    const file: CacheFile = { version: SCHEMA_VERSION, entries: Object.fromEntries(this.entries) }
    try {
      this.backend.write(JSON.stringify(file))
    } catch (err) {
      console.warn('[LyricsCache] Could not save lyrics cache:', err)
    }
  }

  private scheduleWrite(): void {
    if (!this.backend || this.writeTimer) return
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null
      this.flush()
    }, WRITE_DELAY_MS)
    this.writeTimer.unref?.()
  }

  private load(): Map<string, CacheEntry> {
    if (this.entries) return this.entries
    this.entries = new Map()
    const raw = this.backend?.read()
    if (!raw) return this.entries
    try {
      const parsed = JSON.parse(raw) as Partial<CacheFile>
      if (
        parsed.version !== SCHEMA_VERSION ||
        !parsed.entries ||
        typeof parsed.entries !== 'object'
      ) {
        return this.entries
      }
      for (const [key, entry] of Object.entries(parsed.entries)) {
        if (
          entry &&
          typeof entry.savedAt === 'number' &&
          entry.value &&
          typeof entry.value.status === 'string'
        ) {
          this.entries.set(key, { ...entry, usedAt: entry.usedAt || entry.savedAt })
        }
      }
    } catch {
      // A damaged cache is only a cache: start again.
    }
    return this.entries
  }
}
