/** What the song-change card shows, checked before it reaches the card's page. */
export interface TrackToastPayload {
  title: string
  artist: string
  artwork?: string
  accent?: string
  label?: string
  /** Whether the music is playing, for the play/pause button. */
  playing?: boolean
}

export function sanitizeToastPayload(raw: unknown): TrackToastPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (typeof p.title !== 'string' || !p.title.trim()) return null
  const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
  // A cover as a data URL, or an https address (a catalogue cover): nothing else reaches the page.
  const artwork =
    typeof p.artwork === 'string' &&
    ((/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(p.artwork) && p.artwork.length < 4_000_000) ||
      (/^https:\/\/[^\s"'()\\<>]+$/i.test(p.artwork) && p.artwork.length < 2048))
      ? p.artwork
      : undefined
  const accent = typeof p.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : undefined
  return {
    title: text(p.title, 200),
    artist: text(p.artist, 200),
    artwork,
    accent,
    label: text(p.label, 40) || undefined,
    playing: p.playing !== false
  }
}

