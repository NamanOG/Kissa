import type { LyricsResponse } from '../../types/lyrics'
import type { LyricsCacheBackend } from './LyricsCache'

/** User choices do not expire or disappear when the provider cache is cleared. */
export class LyricsOverrides {
  private readonly entries = new Map<string, LyricsResponse>()

  constructor(private readonly backend: LyricsCacheBackend | null = null) {
    try {
      const file = JSON.parse(backend?.read() || 'null')
      if (file?.version !== 1 || !Array.isArray(file.entries)) return
      for (const [key, value] of file.entries) {
        if (
          typeof key === 'string' &&
          value?.source &&
          ((value.status === 'synced' && typeof value.syncedLyrics === 'string') ||
            (value.status === 'plain' && typeof value.plainLyrics === 'string'))
        ) {
          this.entries.set(key, value)
        }
      }
    } catch {
      // A damaged file must not stop playback.
    }
  }

  get(key: string): LyricsResponse | null {
    return this.entries.get(key) ?? null
  }

  set(key: string, value: LyricsResponse | null): void {
    const next = new Map(this.entries)
    if (value) next.set(key, value)
    else next.delete(key)
    // Persist first. If the disk is full, keep the previous choice and report failure.
    this.backend?.write(JSON.stringify({ version: 1, entries: [...next] }))
    this.entries.clear()
    for (const [k, v] of next) this.entries.set(k, v)
  }
}
