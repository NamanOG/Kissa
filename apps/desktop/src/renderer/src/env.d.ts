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
import type {
  LyricsChoice,
  LyricsRequest,
  LyricsResponse,
  LyricsSearchResponse
} from '../../types/lyrics'
import type { UpdateStatusPayload, UpdateInstallResult } from '../../types/update'
import type { DiscordPresenceStatus, StudyPresence, YouTubeMusicConnectorStatus } from '../../types/discord'

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
  exportShare: (options: any) => Promise<boolean>
  getSharePayload: () => Promise<any>
  sendShareReady: (success: boolean) => Promise<void>
  mediaPlayPause: () => Promise<void>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  mediaSeek?: (positionSeconds: number) => Promise<void>
  openExternal?: (url: string) => Promise<void>
  getAppVersion?: () => Promise<string>
  toggleMiniPlayer?: (isMini: boolean, alwaysOnTop?: boolean) => Promise<void>
  setFullScreen: (value: boolean) => Promise<boolean>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
  onWindowVisibility?: (callback: (visible: boolean) => void) => () => void
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
}

declare global {
  interface Window {
    electron: KissaSystemMediaAPI
    __kissaMediaCommandCooldown?: () => void
    __kissaIsDraggingVolume?: boolean
  }
}
