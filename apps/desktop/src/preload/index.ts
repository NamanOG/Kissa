import { contextBridge, ipcRenderer } from 'electron'

import type { SystemMediaPayload } from '../types/media'
import type { LyricsRequest, LyricsResponse } from '../types/lyrics'
import type { ShareExportOptions, SharePayload } from '../types/share'

export interface KissaSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse | null>
  onSystemMediaUpdate: (callback: (data: SystemMediaPayload | null) => void) => () => void
  getVolume: () => Promise<{ master: number; isMuted: boolean } | null>
  mediaPlayPause: () => Promise<void>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  mediaSeek: (positionSeconds: number) => Promise<void>
  openExternal: (url: string) => Promise<void>
  getAppVersion: () => Promise<string>
  toggleMiniPlayer: (isMini: boolean, alwaysOnTop?: boolean) => Promise<void>
  setFullScreen: (value: boolean) => Promise<boolean>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
  syncSettings: (settings: any) => Promise<void>
  setStartup: (enabled: boolean) => Promise<void>
  setProgress: (progress: number, mode?: 'normal' | 'paused' | 'error' | 'none') => Promise<void>
  setThumbarButtons: (isPlaying: boolean) => Promise<void>
  onTrayAction: (callback: (action: string) => void) => () => void
  exportShare: (options: ShareExportOptions) => Promise<boolean>
  getSharePayload: () => Promise<SharePayload | null>
  sendShareReady: (success: boolean) => Promise<void>
  isScreensaver: () => Promise<boolean>
  exitScreensaver: () => Promise<void>
  isScreensaverRegistered: () => Promise<boolean>
  registerScreensaver: () => Promise<{ success: boolean; error?: string; path?: string }>
  unregisterScreensaver: () => Promise<{ success: boolean; removed: boolean; reason?: string; currentPath?: string; error?: string }>
  openScreensaverSettings: () => Promise<{ success: boolean; error?: string }>
}

const kissaMediaAPI: KissaSystemMediaAPI = {
  getSystemMedia: () => ipcRenderer.invoke('kissa:get-system-media'),
  getLyrics: (request) => ipcRenderer.invoke('kissa:get-lyrics', request),
  onSystemMediaUpdate: (callback) => {
    const handler = (_event: unknown, data: SystemMediaPayload | null): void => {
      callback(data)
    }
    ipcRenderer.on('kissa:system-media-update', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:system-media-update', handler)
    }
  },
  getVolume: () => ipcRenderer.invoke('kissa:get-volume'),
  mediaPlayPause: () => ipcRenderer.invoke('kissa:media-play-pause'),
  mediaNext: () => ipcRenderer.invoke('kissa:media-next'),
  mediaPrev: () => ipcRenderer.invoke('kissa:media-prev'),
  mediaSeek: (positionSeconds: number) => ipcRenderer.invoke('kissa:media-seek', positionSeconds),
  openExternal: (url: string) => ipcRenderer.invoke('kissa:open-external', url),
  getAppVersion: () => ipcRenderer.invoke('kissa:get-app-version'),
  toggleMiniPlayer: (isMini: boolean, alwaysOnTop?: boolean) => ipcRenderer.invoke('kissa:toggle-mini-player', isMini, alwaysOnTop),
  setFullScreen: (value: boolean) => ipcRenderer.invoke('kissa:set-fullscreen', value),
  onFullscreenChanged: (callback) => {
    const handler = (_event: unknown, isFullscreen: boolean): void => {
      callback(isFullscreen)
    }
    ipcRenderer.on('kissa:fullscreen-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:fullscreen-changed', handler)
    }
  },
  syncSettings: (settings) => ipcRenderer.invoke('kissa:sync-settings', settings),
  setStartup: (enabled) => ipcRenderer.invoke('kissa:set-startup', enabled),
  setProgress: (progress, mode) => ipcRenderer.invoke('kissa:set-progress', progress, mode),
  setThumbarButtons: (isPlaying) => ipcRenderer.invoke('kissa:set-thumbar', isPlaying),
  onTrayAction: (callback) => {
    const handler = (_event: unknown, action: string): void => {
      callback(action)
    }
    ipcRenderer.on('kissa:tray-action', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:tray-action', handler)
    }
  },
  exportShare: (options) => ipcRenderer.invoke('kissa:export-share', options),
  getSharePayload: () => ipcRenderer.invoke('kissa:get-share-payload'),
  sendShareReady: (success) => ipcRenderer.invoke('kissa:share-ready', success),
  isScreensaver: () => ipcRenderer.invoke('kissa:is-screensaver'),
  exitScreensaver: () => ipcRenderer.invoke('kissa:exit-screensaver'),
  isScreensaverRegistered: () => ipcRenderer.invoke('kissa:is-screensaver-registered'),
  registerScreensaver: () => ipcRenderer.invoke('kissa:register-screensaver'),
  unregisterScreensaver: () => ipcRenderer.invoke('kissa:unregister-screensaver'),
  openScreensaverSettings: () => ipcRenderer.invoke('kissa:open-screensaver-settings')
}

contextBridge.exposeInMainWorld('electron', {
  
  ...kissaMediaAPI
})
