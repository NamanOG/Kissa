/**
 * Where sharing on Discord stands, as the settings row explains it.
 *
 * - off: the person has not turned sharing on.
 * - unconfigured: this build carries no Discord application ID.
 * - no-discord: sharing is on, but the Discord desktop app is not running (Kissa keeps trying).
 * - idle: connected; Kissa is not following a shared player (Apple Music, or Spotify when opted in) right now, so nothing is shown.
 * - sharing: the current track is on the profile.
 * - paused: the shared player is paused; the track stays briefly, without a time bar.
 * - studying: a Study Room session is on the profile.
 */
export type DiscordPresenceState = 'off' | 'unconfigured' | 'no-discord' | 'idle' | 'sharing' | 'paused' | 'studying'

export interface DiscordPresenceStatus {
  enabled: boolean
  /** Also share Spotify sessions (off by default). */
  shareSpotify: boolean
  /** Show a running Study Room session (on by default once sharing is on). */
  shareStudy: boolean
  /** Share YouTube Music played in a browser, via the paired Kissa connector (off by default). */
  shareYouTubeMusic: boolean
  state: DiscordPresenceState
}

/**
 * What the Study Room tells Discord about a running session. Never the intention, the
 * steps' text or parked thoughts: only the room, the phase, its timing and a step count.
 */
export interface StudyPresence {
  phase: 'focus' | 'break' | 'paused'
  /** The room's name, e.g. "Rain room". */
  room: string
  /** Epoch ms when the current timed block ends (countdown on the profile). */
  endsAt?: number
  /** Epoch ms the current open block started (time studied on the profile). */
  startedAt?: number
  /** The focus block number, from 1. */
  round?: number
  tasksDone?: number
  tasksTotal?: number
}

/** The local link to the Kissa connector for YouTube Music, as the settings row shows it. */
export interface YouTubeMusicConnectorStatus {
  /** Kissa is listening for the connector (only while YouTube Music sharing is on). */
  listening: boolean
  paired: boolean
  /** The connector is reporting YouTube Music right now. */
  connected: boolean
  /** A code to type into the connector, while pairing. */
  pairing: { code: string; expiresAt: number } | null
}
