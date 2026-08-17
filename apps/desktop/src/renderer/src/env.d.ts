/// <reference types="vite/client" />

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
