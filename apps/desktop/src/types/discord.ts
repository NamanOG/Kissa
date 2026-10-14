/**
 * Where music sharing on Discord stands, as the settings row explains it.
 *
 * - off: the person has not turned sharing on.
 * - unconfigured: this build carries no Discord application ID.
 * - no-discord: sharing is on, but the Discord desktop app is not running (Kissa keeps trying).
 * - idle: connected; Kissa is not following a shared player (Apple Music, or Spotify when opted in) right now, so nothing is shown.
 * - sharing: the current track is on the profile.
 * - paused: the shared player is paused; the track stays briefly, without a time bar.
 */
export type DiscordPresenceState = 'off' | 'unconfigured' | 'no-discord' | 'idle' | 'sharing' | 'paused'

export interface DiscordPresenceStatus {
  enabled: boolean
  /** Also share Spotify sessions (off by default). */
  shareSpotify: boolean
  state: DiscordPresenceState
}
