export interface SystemMediaPayload {
  sourceAppId: string
  sourceAppName: string
  title: string
  artist: string
  album: string
  artworkDataUrl?: string
  /** Set by the main process instead of resending an embedded cover the window already has. */
  artworkUnchanged?: boolean
  isPlaying: boolean
  playbackType?: number
  progress: number
  duration: number
  lastUpdatedTime?: number
  volume?: number
  isMuted?: boolean
}
