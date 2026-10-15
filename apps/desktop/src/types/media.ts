export interface SystemMediaPayload {
  sourceAppId: string
  sourceAppName: string
  title: string
  artist: string
  album: string
  artworkDataUrl?: string
  /**
   * A public (https) copy of the cover for places that cannot show an embedded image
   * (Discord). The player's own picture when one was found; otherwise the official cover
   * of the same-named album, which can be a different edition or a still of motion art.
   */
  publicArtworkUrl?: string
  /** Set by the main process instead of resending an embedded cover the window already has. */
  artworkUnchanged?: boolean
  isPlaying: boolean
  /** False when the source refuses position changes from other apps. */
  canSeek?: boolean
  playbackType?: number
  progress: number
  duration: number
  lastUpdatedTime?: number
  volume?: number
  isMuted?: boolean
}
