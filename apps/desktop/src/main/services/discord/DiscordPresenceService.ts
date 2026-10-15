import type { SystemMediaPayload } from '../../../types/media'
import type { DiscordPresenceState, DiscordPresenceStatus, StudyPresence } from '../../../types/discord'
import { DiscordIpcClient } from './DiscordIpcClient'

/**
 * Shows the track Kissa is following on the person's Discord profile, when they have turned
 * that on: Apple Music (and iTunes) always, Spotify only if they also opt in (Spotify can share
 * itself, which would put two cards on the profile). Any other source clears Kissa's activity.
 *
 * It listens to the same normalized media updates as the windows do, so it works with
 * every window closed (tray) and starts no polling of its own.
 */

/** Discord accepts about five activity updates per 20 seconds. */
const MIN_SEND_INTERVAL_MS = 4_000
/** A paused track stays on the profile this long, without a time bar, then is cleared. */
const PAUSED_CLEAR_MS = 2 * 60 * 1000
/** A position this far off the time bar Discord is showing counts as a seek. */
const SEEK_TOLERANCE_MS = 3_000
const RECONNECT_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000]

const KISSA_STORE_URL = 'https://apps.microsoft.com/detail/9p3n4x4wm80j'
/** Public, served by the Kissa website (180x180 PNG). */
const KISSA_BADGE_URL = 'https://kissa.glyphcode.studio/favicon.png'
const KISSA_BADGE_TEXT = 'Kissa · vinyl player for Windows'

export interface PresenceClient {
  connect(): Promise<void>
  setActivity(activity: Record<string, unknown> | null): Promise<unknown>
  close(): void
  on(event: 'close', listener: () => void): unknown
}

export interface PresenceSettingsStore {
  load(): { enabled: boolean; shareSpotify?: boolean; shareStudy?: boolean }
  save(settings: { enabled: boolean; shareSpotify: boolean; shareStudy: boolean }): void
}

export interface DiscordPresenceOptions {
  applicationId: string
  settings: PresenceSettingsStore
  createClient?: (applicationId: string) => PresenceClient
  now?: () => number
}

/** The Windows Apple Music app, or iTunes. Not a browser tab playing music.apple.com. */
export function isAppleMusicSource(sourceAppId: string | undefined): boolean {
  if (!sourceAppId) return false
  const id = sourceAppId.toLowerCase()
  return id.startsWith('appleinc.applemusicwin') || id.includes('applemusic') || /(^|[\\/])itunes(\.exe)?$/.test(id) || id === 'itunes'
}

/** The Spotify desktop app (classic or Microsoft Store). */
export function isSpotifySource(sourceAppId: string | undefined): boolean {
  return Boolean(sourceAppId && sourceAppId.toLowerCase().includes('spotify'))
}

/** Discord rejects text under 2 or over 128 characters. */
function fit(text: string | undefined): string | undefined {
  const value = (text || '').trim()
  if (!value) return undefined
  const padded = value.length < 2 ? `${value} ` : value
  return padded.length > 128 ? `${padded.slice(0, 127)}…` : padded
}

interface Desired {
  key: string
  activity: Record<string, unknown>
  /** When the track started, for the time bar. Undefined while paused or unknown. */
  startMs?: number
  paused: boolean
  /** A Study Room session, not a track. */
  study?: boolean
}

export class DiscordPresenceService {
  private enabled: boolean
  /** Spotify can share itself; Kissa shares it too only when asked, for Kissa's card and Store link. */
  private shareSpotify: boolean
  /** Show a running Study Room session (on unless turned off; sharing itself is opt-in). */
  private shareStudy: boolean
  private study: StudyPresence | null = null
  private client: PresenceClient | null = null
  private connecting = false
  private connected = false
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private latest: SystemMediaPayload | null = null
  private pausedSince: number | null = null
  private pausedTimer: ReturnType<typeof setTimeout> | null = null

  private sent: Desired | null = null
  private lastSendAt = 0
  private sendTimer: ReturnType<typeof setTimeout> | null = null
  /** Bumped whenever presence is cleared or turned off; an older queued update is dropped. */
  private generation = 0
  /** Discord builds that reject newer fields get the activity without them. */
  private useStatusDisplayType = true
  private useLinks = true
  private useButtons = true

  private state: DiscordPresenceState = 'off'
  private readonly listeners = new Set<(status: DiscordPresenceStatus) => void>()

  private readonly createClient: (applicationId: string) => PresenceClient
  private readonly now: () => number

  constructor(private readonly options: DiscordPresenceOptions) {
    this.createClient = options.createClient ?? ((id) => new DiscordIpcClient(id))
    this.now = options.now ?? Date.now
    const saved = options.settings.load()
    this.enabled = Boolean(saved.enabled)
    this.shareSpotify = saved.shareSpotify === true
    this.shareStudy = saved.shareStudy !== false
    this.updateState()
    if (this.enabled && this.options.applicationId) void this.ensureConnected()
  }

  public getStatus(): DiscordPresenceStatus {
    return { enabled: this.enabled, shareSpotify: this.shareSpotify, shareStudy: this.shareStudy, state: this.state }
  }

  public onStatusChange(listener: (status: DiscordPresenceStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public setEnabled(enabled: boolean): DiscordPresenceStatus {
    if (enabled === this.enabled) return this.getStatus()
    this.enabled = enabled
    this.persist()
    if (enabled) {
      if (this.options.applicationId) void this.ensureConnected()
    } else {
      // Clear immediately, then let go of Discord.
      this.generation++
      this.cancelSend()
      this.cancelPausedTimer()
      this.cancelReconnect()
      const client = this.client
      this.client = null
      this.connected = false
      this.sent = null
      if (client) {
        client
          .setActivity(null)
          .catch(() => {})
          .finally(() => client.close())
      }
    }
    this.updateState()
    return this.getStatus()
  }

  public setShareSpotify(on: boolean): DiscordPresenceStatus {
    if (on === this.shareSpotify) return this.getStatus()
    this.shareSpotify = on
    this.persist()
    this.onMedia(this.latest)
    this.updateState()
    return this.getStatus()
  }

  public setShareStudy(on: boolean): DiscordPresenceStatus {
    if (on === this.shareStudy) return this.getStatus()
    this.shareStudy = on
    this.persist()
    this.reconcile()
    this.updateState()
    return this.getStatus()
  }

  /** The running Study Room session from the window, or null when there is none. */
  public setStudy(study: StudyPresence | null): void {
    this.study = study
    this.reconcile()
    this.updateState()
  }

  private persist(): void {
    this.options.settings.save({ enabled: this.enabled, shareSpotify: this.shareSpotify, shareStudy: this.shareStudy })
  }

  private isShared(sourceAppId: string | undefined): boolean {
    return isAppleMusicSource(sourceAppId) || (this.shareSpotify && isSpotifySource(sourceAppId))
  }

  /** Every normalized media update, from MediaDetectionService. */
  public onMedia(payload: SystemMediaPayload | null): void {
    this.latest = payload
    if (payload && !payload.isPlaying && this.isShared(payload.sourceAppId)) {
      if (this.pausedSince === null) this.pausedSince = this.now()
    } else {
      this.pausedSince = null
      this.cancelPausedTimer()
    }
    if (!this.enabled) return
    this.reconcile()
  }

  public shutdown(): void {
    this.generation++
    this.cancelSend()
    this.cancelPausedTimer()
    this.cancelReconnect()
    const client = this.client
    this.client = null
    this.connected = false
    if (client) {
      // Discord also clears a closed connection's activity; this just makes it prompt.
      client.setActivity(null).catch(() => {})
      client.close()
    }
  }

  private desired(): Desired | null {
    if (this.study && this.shareStudy) return this.studyDesired(this.study)
    const p = this.latest
    if (!p || !p.title || !this.isShared(p.sourceAppId)) return null
    if (p.title === 'Unknown Title') return null

    const paused = !p.isPlaying
    if (paused && this.pausedSince !== null && this.now() - this.pausedSince >= PAUSED_CLEAR_MS) return null

    const details = fit(p.title)
    const state = fit(p.artist && p.artist !== 'Unknown Artist' ? p.artist : undefined)
    // Only a public cover Kissa matched to this exact album; an embedded image is never uploaded.
    const art = p.artworkDataUrl && p.artworkDataUrl.startsWith('https://') ? p.artworkDataUrl : undefined
    const album = fit(p.album && p.album !== p.title ? p.album : undefined)

    const activity: Record<string, unknown> = { type: 2, details }
    if (state) activity.state = state
    if (this.useStatusDisplayType) activity.status_display_type = 2
    // Kissa's mark sits on the cover's corner and, like the button, leads to the Store page,
    // so people who see the activity can find the app.
    activity.assets = art
      ? {
          large_image: art,
          ...(album ? { large_text: album } : {}),
          small_image: KISSA_BADGE_URL,
          small_text: KISSA_BADGE_TEXT,
          ...(this.useLinks ? { small_url: KISSA_STORE_URL } : {})
        }
      : { large_image: KISSA_BADGE_URL, large_text: KISSA_BADGE_TEXT, ...(this.useLinks ? { large_url: KISSA_STORE_URL } : {}) }
    if (this.useButtons) activity.buttons = [{ label: 'Get Kissa for Windows', url: KISSA_STORE_URL }]

    let startMs: number | undefined
    const duration = p.duration > 0 ? p.duration : 0
    if (!paused && duration > 0 && p.progress >= 0 && p.progress <= duration + 1) {
      const sampledAt = p.lastUpdatedTime && p.lastUpdatedTime <= this.now() + 1000 ? p.lastUpdatedTime : this.now()
      startMs = sampledAt - p.progress * 1000
      activity.timestamps = {
        start: Math.round(startMs),
        end: Math.round(startMs + duration * 1000)
      }
    }

    const key = JSON.stringify([details, state, art, album, paused, Math.round(duration)])
    return { key, activity, startMs, paused }
  }

  /**
   * A study session reads "Playing Kissa" with the room and a countdown (or time studied).
   * The intention and steps stay private; only how many steps are done is shown. The song
   * appears only when it comes from a player the person chose to share.
   */
  private studyDesired(s: StudyPresence): Desired {
    const room = fit(s.room) ?? 'Study Room'
    const details =
      s.phase === 'break' ? `On a break · ${room}` : s.phase === 'paused' ? `Studying · ${room} (paused)` : `Studying · ${room}`
    const p = this.latest
    const song = p && p.isPlaying && p.title && p.title !== 'Unknown Title' && this.isShared(p.sourceAppId) ? p : null
    const state = song
      ? fit(`♪ ${song.title}${song.artist && song.artist !== 'Unknown Artist' ? ` · ${song.artist}` : ''}`)
      : s.tasksTotal && s.tasksTotal > 0
        ? `${Math.min(s.tasksDone ?? 0, s.tasksTotal)} of ${s.tasksTotal} steps done`
        : s.phase === 'focus' && s.round
          ? `Focus block ${s.round}`
          : undefined

    const activity: Record<string, unknown> = { type: 0, details: fit(details) }
    if (state) activity.state = state
    activity.assets = {
      large_image: KISSA_BADGE_URL,
      large_text: 'Kissa Study Room',
      ...(this.useLinks ? { large_url: KISSA_STORE_URL } : {})
    }
    if (this.useButtons) activity.buttons = [{ label: 'Get Kissa for Windows', url: KISSA_STORE_URL }]
    if (s.phase !== 'paused') {
      if (s.endsAt && s.endsAt > this.now()) activity.timestamps = { end: Math.round(s.endsAt) }
      else if (s.startedAt) activity.timestamps = { start: Math.round(s.startedAt) }
    }
    const key = JSON.stringify(['study', details, state, s.phase, s.endsAt ? Math.round(s.endsAt / 5000) : null, s.startedAt ? Math.round(s.startedAt / 5000) : null])
    return { key, activity, paused: false, study: true }
  }

  private reconcile(): void {
    if (!this.enabled) return
    const next = this.desired()
    this.schedulePausedClear()

    if (!next) {
      this.updateState()
      if (this.sent) this.clearActivity()
      return
    }

    if (!this.connected) {
      this.updateState()
      void this.ensureConnected()
      return
    }

    const prev = this.sent
    const changed =
      !prev ||
      prev.key !== next.key ||
      (next.startMs !== undefined && (prev.startMs === undefined || Math.abs(prev.startMs - next.startMs) > SEEK_TOLERANCE_MS))
    if (changed) this.scheduleSend()
    this.updateState()
  }

  private scheduleSend(): void {
    if (this.sendTimer) return
    const wait = Math.max(0, this.lastSendAt + MIN_SEND_INTERVAL_MS - this.now())
    const generation = this.generation
    this.sendTimer = setTimeout(() => {
      this.sendTimer = null
      if (generation !== this.generation) return
      // Built at send time from the newest update, so a burst of skips sends only the last track.
      const next = this.desired()
      if (!next) {
        if (this.sent) this.clearActivity()
        return
      }
      void this.send(next, generation)
    }, wait)
  }

  private async send(next: Desired, generation: number): Promise<void> {
    const client = this.client
    if (!client || !this.connected) return
    this.lastSendAt = this.now()
    this.sent = next
    this.updateState()
    try {
      await client.setActivity(next.activity)
    } catch (err) {
      if (generation !== this.generation) return
      const message = err instanceof Error ? err.message : String(err)
      // Older Discord builds reject newer activity fields: drop the one named and retry.
      const drop =
        this.useStatusDisplayType && /status_display_type/i.test(message)
          ? (): void => void (this.useStatusDisplayType = false)
          : this.useLinks && /_url/i.test(message)
            ? (): void => void (this.useLinks = false)
            : this.useButtons && /button/i.test(message)
              ? (): void => void (this.useButtons = false)
              : null
      if (drop) {
        drop()
        this.sent = null
        this.reconcile()
        return
      }
      console.warn('[DiscordPresence] Discord did not accept the activity:', message)
    }
    // Turned off or cleared while the request was in flight: make sure nothing stays.
    if (generation !== this.generation && this.client === client) {
      client.setActivity(null).catch(() => {})
    }
  }

  private clearActivity(): void {
    this.generation++
    this.cancelSend()
    this.sent = null
    this.updateState()
    const client = this.client
    if (client && this.connected) {
      this.lastSendAt = this.now()
      client.setActivity(null).catch(() => {})
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.enabled || this.connected || this.connecting || !this.options.applicationId) return
    this.cancelReconnect()
    this.connecting = true
    const client = this.createClient(this.options.applicationId)
    try {
      await client.connect()
    } catch {
      this.connecting = false
      this.updateState()
      this.scheduleReconnect()
      return
    }
    this.connecting = false
    if (!this.enabled) {
      client.close()
      return
    }
    this.client = client
    this.connected = true
    this.reconnectAttempt = 0
    this.sent = null
    client.on('close', () => {
      if (this.client !== client) return
      this.client = null
      this.connected = false
      this.sent = null
      this.cancelSend()
      this.updateState()
      this.scheduleReconnect()
    })
    this.reconcile()
  }

  private scheduleReconnect(): void {
    if (!this.enabled || this.reconnectTimer) return
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    this.reconnectAttempt++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.ensureConnected()
    }, delay)
    this.reconnectTimer.unref?.()
  }

  private schedulePausedClear(): void {
    this.cancelPausedTimer()
    if (this.pausedSince === null || !this.enabled) return
    const remaining = this.pausedSince + PAUSED_CLEAR_MS - this.now()
    if (remaining <= 0) return
    this.pausedTimer = setTimeout(() => {
      this.pausedTimer = null
      this.reconcile()
    }, remaining)
    this.pausedTimer.unref?.()
  }

  private cancelSend(): void {
    if (this.sendTimer) clearTimeout(this.sendTimer)
    this.sendTimer = null
  }

  private cancelPausedTimer(): void {
    if (this.pausedTimer) clearTimeout(this.pausedTimer)
    this.pausedTimer = null
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private updateState(): void {
    let state: DiscordPresenceState
    if (!this.options.applicationId) state = 'unconfigured'
    else if (!this.enabled) state = 'off'
    else if (!this.connected) state = 'no-discord'
    else {
      const next = this.desired()
      state = !next ? 'idle' : next.study ? 'studying' : next.paused ? 'paused' : 'sharing'
    }
    if (state === this.state) return
    this.state = state
    const status = this.getStatus()
    for (const listener of this.listeners) listener(status)
  }
}
