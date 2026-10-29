/**
 * The last thing another player (Spotify, Apple Music...) reported, kept by useSystemMediaSync.
 * It tells a steady "still playing" report from a player that has just started, so a Kissa album
 * is only replaced when the listener actually starts music somewhere else.
 */
export const externalSession = { key: '', playing: false }

export function resetExternalSession(): void {
  externalSession.key = ''
  externalSession.playing = false
}
