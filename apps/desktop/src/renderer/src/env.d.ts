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

import type { ElectronAPI } from '@electron-toolkit/preload'
import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest, LyricsResponse } from '../../types/lyrics'

export interface PhonoSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse | null>
  onSystemMediaUpdate: (callback: (data: SystemMediaPayload | null) => void) => () => void
  mediaPlayPause: () => Promise<void>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  openExternal?: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI & PhonoSystemMediaAPI
  }
}
