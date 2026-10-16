export interface LyricsRequest {
  title: string
  artist: string
  album: string
  duration: number
  /** Ask the provider again even if a recent lookup found nothing. */
  force?: boolean
}

/**
 * What a lookup concluded. "not-found" means the library answered and had nothing for
 * this recording; "unavailable" means it could not be asked (offline, throttled, down),
 * so trying again later may help.
 */
export type LyricsOutcome = 'synced' | 'plain' | 'instrumental' | 'not-found' | 'unavailable'

export interface LyricsResponse {
  status: LyricsOutcome
  syncedLyrics: string | null
  plainLyrics: string | null
  instrumental: boolean
  duration?: number
  /** A deliberate choice, kept separately from the expiring provider cache. */
  source?: 'lrclib-choice' | 'lrc-import'
}

export interface LyricsCandidate {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  synced: boolean
  preview: string
}

export interface LyricsSearchResponse {
  status: 'ok' | 'unavailable'
  candidates: LyricsCandidate[]
}

export type LyricsChoice =
  { kind: 'candidate'; id: number } | { kind: 'import'; text: string } | { kind: 'reset' }
