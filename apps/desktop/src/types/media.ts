export interface SystemMediaPayload {
  sourceAppId: string
  sourceAppName: string
  title: string
  artist: string
  album: string
  artworkDataUrl?: string
  isPlaying: boolean
  playbackType?: number
  progress: number
  duration: number
  lastUpdatedTime?: number
  volume?: number
  isMuted?: boolean
}
