/**
 * Where Apple Music sharing on Discord stands, as the settings row explains it.
 *
 * - off: the person has not turned sharing on.
 * - unconfigured: this build carries no Discord application ID.
 * - no-discord: sharing is on, but the Discord desktop app is not running (Kissa keeps trying).
 * - idle: connected; Apple Music is not what Kissa is following right now, so nothing is shown.
 * - sharing: the current Apple Music track is on the profile.
 * - paused: Apple Music is paused; the track stays briefly, without a time bar.
 */
export type DiscordPresenceState = 'off' | 'unconfigured' | 'no-discord' | 'idle' | 'sharing' | 'paused'

export interface DiscordPresenceStatus {
  enabled: boolean
  state: DiscordPresenceState
}
