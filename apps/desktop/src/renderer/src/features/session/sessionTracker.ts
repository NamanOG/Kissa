import { appendPlay, MIN_SECONDS } from './history'

export interface TrackRef {
  title: string
  artist: string
  album: string
  artwork?: string
  /** The room the song played in. */
  room?: string
}

export interface SessionSummary {
  minutes: number
  songs: number
  albums: number
  covers: string[]
}

/** Paused this long, the session is over. */
export const SESSION_GAP_MS = 90_000
/** A session shorter than this ends quietly. */
export const SESSION_MIN_MS = 10 * 60_000

/**
 * Counts what is heard, one tick a second. Songs heard for 30 seconds or more go to the local
 * history; when the music has been stopped for 90 seconds, the session ends and, if it was
 * long enough, returns a summary to show.
 */
export class SessionTracker {
  private current: { ref: TrackRef; key: string; startedAt: number; heardMs: number } | null = null
  private sessionMs = 0
  private songs = new Set<string>()
  private albums = new Map<string, string | undefined>()
  private stoppedSince: number | null = null
  private lastTick: number | null = null

  constructor(private readonly record: typeof appendPlay = appendPlay) {}

  private finishSong(): void {
    const c = this.current
    this.current = null
    if (!c || c.heardMs < MIN_SECONDS * 1000) return
    const heard = c.heardMs / 1000
    this.record(
      c.ref.room
        ? [c.startedAt, c.ref.title, c.ref.artist, c.ref.album, heard, c.ref.room]
        : [c.startedAt, c.ref.title, c.ref.artist, c.ref.album, heard]
    )
    this.songs.add(c.key)
    const albumKey = `${c.ref.album}\u0000${c.ref.artist}`
    if (c.ref.album && !this.albums.has(albumKey)) this.albums.set(albumKey, c.ref.artwork)
  }

  private endSession(): SessionSummary | null {
    this.finishSong()
    const summary: SessionSummary | null =
      this.sessionMs >= SESSION_MIN_MS && this.songs.size > 0
        ? {
            minutes: Math.round(this.sessionMs / 60_000),
            songs: this.songs.size,
            albums: this.albums.size,
            covers: [...this.albums.values()].filter((c): c is string => !!c).slice(0, 3)
          }
        : null
    this.sessionMs = 0
    this.songs.clear()
    this.albums.clear()
    this.stoppedSince = null
    return summary
  }

  /** Returns a summary when a session has just ended. */
  tick(now: number, playing: boolean, track: TrackRef | null): SessionSummary | null {
    const elapsed = this.lastTick === null ? 0 : Math.min(5000, Math.max(0, now - this.lastTick))
    this.lastTick = now
    const key = track ? `${track.title}\u0000${track.artist}` : ''

    if (track && this.current?.key !== key) {
      this.finishSong()
      if (playing) this.current = { ref: track, key, startedAt: now, heardMs: 0 }
    }

    if (playing && track) {
      if (!this.current) this.current = { ref: track, key, startedAt: now, heardMs: 0 }
      this.current.heardMs += elapsed
      this.sessionMs += elapsed
      this.stoppedSince = null
      return null
    }

    if (this.stoppedSince === null) this.stoppedSince = now
    if (now - this.stoppedSince >= SESSION_GAP_MS && (this.sessionMs > 0 || this.current)) return this.endSession()
    return null
  }
}
