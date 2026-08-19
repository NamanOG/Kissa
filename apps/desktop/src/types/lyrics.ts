export interface LyricsRequest {
  title: string
  artist: string
  album: string
  duration: number
}

export interface LyricsResponse {
  syncedLyrics: string | null
  plainLyrics: string | null
  instrumental: boolean
  duration?: number
}
