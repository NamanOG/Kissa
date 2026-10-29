/// <reference types="vite/client" />
/// <reference types="node" />

declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.wav' {
  const src: string
  export default src
}
declare module '*.mp3' {
  const src: string
  export default src
}
declare module '*.svg' {
  const src: string
  export default src
}

import type { SystemMediaPayload } from '../../types/media'
import type { LocalAlbumResult, TrackProblem } from '../../types/album'
import type {
  LyricsChoice,
  LyricsRequest,
  LyricsResponse,
  LyricsSearchResponse
} from '../../types/lyrics'
import type { UpdateStatusPayload, UpdateInstallResult } from '../../types/update'
import type { DiscordPresenceStatus, StudyPresence, YouTubeMusicConnectorStatus } from '../../types/discord'
import type { RemoteQueue } from '../../types/remoteQueue'
import type { PhoneRemoteStatus, RemoteCommand, RemoteLook, RemoteLyricLine, RemoteNowPlaying } from '../../types/remote'

/** An album's sides, as the main process returns them (main/services/albumSides.ts). */
export interface AlbumSidesResult {
  kind: 'vinyl' | 'split' | 'single'
  sides: Array<{ letter: string; tracks: Array<{ title: string; length: number }> }>
}

export interface KissaSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse | null>
  searchLyrics: (request: LyricsRequest, query: string) => Promise<LyricsSearchResponse>
  chooseLyrics: (request: LyricsRequest, choice: LyricsChoice) => Promise<LyricsResponse | null>
  onSystemMediaUpdate: (callback: (data: SystemMediaPayload | null) => void) => () => void
  getVolume: () => Promise<{ master: number; isMuted: boolean } | null>
  setProgress: (progress: number, mode?: 'normal' | 'paused' | 'error' | 'none') => Promise<void>
  setThumbarButtons: (isPlaying: boolean) => Promise<void>
  onTrayAction: (callback: (action: string) => void) => () => void
  takeJumpPlace?: () => Promise<string | null>
  getAlbumSides?: (artist: string, album: string) => Promise<AlbumSidesResult | null>
  showTrackToast?: (payload: { title: string; artist: string; artwork?: string; accent?: string; label?: string; playing?: boolean }) => Promise<boolean>
  setJumpList?: (labels: Record<string, string>) => Promise<void>
  exportShare: (options: any) => Promise<boolean>
  getSharePayload: () => Promise<any>
  sendShareReady: (success: boolean) => Promise<void>
  mediaPlayPause: () => Promise<void>
  chooseAlbumFolder?: () => Promise<LocalAlbumResult>
  albumTrackProblem?: (url: string) => Promise<TrackProblem>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  mediaSeek?: (positionSeconds: number) => Promise<void>
  openExternal?: (url: string) => Promise<void>
  getAppVersion?: () => Promise<string>
  toggleMiniPlayer?: (isMini: boolean, alwaysOnTop?: boolean) => Promise<void>
  setFullScreen: (value: boolean) => Promise<boolean>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
  onWindowVisibility?: (callback: (visible: boolean) => void) => () => void
  /** Mini player only: whether the cursor is over the window (watched by the main process). */
  onMiniHover?: (callback: (inside: boolean) => void) => () => void
  getGraphics?: () => Promise<{ hardwareAcceleration: boolean; activeNow: boolean }>
  setHardwareAcceleration?: (on: boolean) => Promise<{ hardwareAcceleration: boolean; activeNow: boolean }>
  relaunchApp?: () => Promise<void>
  isScreensaver: () => Promise<boolean>
  exitScreensaver: () => Promise<void>
  onScreensaverModeChanged?: (callback: (isScreensaver: boolean) => void) => () => void
  isScreensaverRegistered?: () => Promise<boolean>
  registerScreensaver?: () => Promise<{
    success: boolean
    error?: string
    path?: string
    manual?: boolean
  }>
  unregisterScreensaver?: () => Promise<{
    success: boolean
    removed: boolean
    reason?: string
    currentPath?: string
    error?: string
  }>
  openScreensaverSettings?: () => Promise<{ success: boolean; error?: string }>
  getUpdateStatus?: () => Promise<UpdateStatusPayload>
  checkForUpdates?: () => Promise<UpdateStatusPayload>
  downloadUpdate?: () => Promise<UpdateStatusPayload>
  cancelUpdate?: () => Promise<UpdateStatusPayload>
  installUpdate?: () => Promise<UpdateInstallResult>
  openStorePage?: () => Promise<void>
  openStoreReview?: () => Promise<void>
  onUpdateStatusChanged?: (callback: (status: UpdateStatusPayload) => void) => () => void
  getDiscordPresence?: () => Promise<DiscordPresenceStatus>
  setStudyKeepAwake?: (on: boolean) => Promise<boolean>
  setDiscordPresenceEnabled: (enabled: boolean) => Promise<DiscordPresenceStatus>
  setDiscordShareSpotify?: (on: boolean) => Promise<DiscordPresenceStatus>
  setDiscordShareStudy?: (on: boolean) => Promise<DiscordPresenceStatus>
  setDiscordStudy?: (study: StudyPresence | null) => void
  setDiscordShareYouTubeMusic?: (on: boolean) => Promise<DiscordPresenceStatus>
  getYouTubeMusicConnector?: () => Promise<YouTubeMusicConnectorStatus>
  beginYouTubeMusicPairing?: () => Promise<YouTubeMusicConnectorStatus>
  cancelYouTubeMusicPairing?: () => Promise<YouTubeMusicConnectorStatus>
  forgetYouTubeMusicConnector?: () => Promise<YouTubeMusicConnectorStatus>
  onYouTubeMusicConnectorChanged?: (callback: (status: YouTubeMusicConnectorStatus) => void) => () => void
  onDiscordPresenceChanged?: (callback: (status: DiscordPresenceStatus) => void) => () => void
  getPhoneRemote?: () => Promise<PhoneRemoteStatus>
  setPhoneRemoteOn?: (on: boolean) => Promise<PhoneRemoteStatus>
  sendRemoteQueue?: (snapshot: RemoteQueue) => void
  sendRemoteLook?: (look: RemoteLook) => void
  sendRemoteNowPlaying?: (snapshot: RemoteNowPlaying) => void
  sendRemoteLyrics?: (track: { title: string; artist: string }, lines: RemoteLyricLine[]) => void
  onPhoneRemoteChanged?: (callback: (status: PhoneRemoteStatus) => void) => () => void
  onRemoteCommand?: (callback: (command: RemoteCommand) => void) => () => void
}

declare global {
  interface Window {
    electron: KissaSystemMediaAPI
    __kissaMediaCommandCooldown?: () => void
    __kissaIsDraggingVolume?: boolean
  }
}
