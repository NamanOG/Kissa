import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { SystemMediaPayload } from '../types/media'
import type { LyricsRequest, LyricsResponse } from '../types/lyrics'

export interface PhonoSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse | null>
  onSystemMediaUpdate: (callback: (data: SystemMediaPayload | null) => void) => () => void
  mediaPlayPause: () => Promise<void>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  openExternal: (url: string) => Promise<void>
}

const phonoMediaAPI: PhonoSystemMediaAPI = {
  getSystemMedia: () => ipcRenderer.invoke('phono:get-system-media'),
  getLyrics: (request) => ipcRenderer.invoke('phono:get-lyrics', request),
  onSystemMediaUpdate: (callback) => {
    const handler = (_event: unknown, data: SystemMediaPayload | null): void => {
      callback(data)
    }
    ipcRenderer.on('phono:system-media-update', handler)
    return (): void => {
      ipcRenderer.removeListener('phono:system-media-update', handler)
    }
  },
  mediaPlayPause: () => ipcRenderer.invoke('phono:media-play-pause'),
  mediaNext: () => ipcRenderer.invoke('phono:media-next'),
  mediaPrev: () => ipcRenderer.invoke('phono:media-prev'),
  openExternal: (url: string) => ipcRenderer.invoke('phono:open-external', url)
}

contextBridge.exposeInMainWorld('electron', {
  ...electronAPI,
  ...phonoMediaAPI
})
