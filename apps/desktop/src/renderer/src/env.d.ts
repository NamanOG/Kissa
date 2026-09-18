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
declare module '*.mp3' {
  const src: string
  export default src
}
declare module '*.svg' {
  const src: string
  export default src
}


import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest, LyricsResponse } from '../../types/lyrics'
import type { UpdateStatusPayload, UpdateInstallResult } from '../../types/update'

export interface KissaSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse | null>
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
  isScreensaver: () => Promise<boolean>
  exitScreensaver: () => Promise<void>
  onScreensaverModeChanged?: (callback: (isScreensaver: boolean) => void) => () => void
  isScreensaverRegistered?: () => Promise<boolean>
  registerScreensaver?: () => Promise<{ success: boolean; error?: string; path?: string }>
  unregisterScreensaver?: () => Promise<{ success: boolean; removed: boolean; reason?: string; currentPath?: string; error?: string }>
  openScreensaverSettings?: () => Promise<{ success: boolean; error?: string }>
  getUpdateStatus?: () => Promise<UpdateStatusPayload>
  checkForUpdates?: () => Promise<UpdateStatusPayload>
  downloadUpdate?: () => Promise<UpdateStatusPayload>
  cancelUpdate?: () => Promise<UpdateStatusPayload>
  installUpdate?: () => Promise<UpdateInstallResult>
  onUpdateStatusChanged?: (callback: (status: UpdateStatusPayload) => void) => () => void
}

declare global {
  interface Window {
    electron: KissaSystemMediaAPI
    __kissaMediaCommandCooldown?: () => void
    __kissaIsDraggingVolume?: boolean
  }
}
