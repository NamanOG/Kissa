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
  openExternal?: (url: string) => Promise<void>
  getAppVersion?: () => Promise<string>
  toggleMiniPlayer?: (isMini: boolean, alwaysOnTop?: boolean) => Promise<void>
  setFullScreen: (value: boolean) => Promise<boolean>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
}

declare global {
  interface Window {
    electron: KissaSystemMediaAPI
    __kissaMediaCommandCooldown?: () => void
    __kissaIsDraggingVolume?: boolean
  }
}
