import { contextBridge, ipcRenderer } from 'electron'

import type { SystemMediaPayload } from '../types/media'
import type { LocalAlbumResult, TrackProblem } from '../types/album'
import type {
  LyricsChoice,
  LyricsRequest,
  LyricsResponse,
  LyricsSearchResponse
} from '../types/lyrics'
import type { ShareExportOptions, SharePayload } from '../types/share'
import type { UpdateStatusPayload, UpdateInstallResult } from '../types/update'
import type { DiscordPresenceStatus, StudyPresence, YouTubeMusicConnectorStatus } from '../types/discord'
import type { RemoteQueue } from '../types/remoteQueue'
import type { DesktopLyricsFrame, DesktopLyricsSize, DesktopLyricsStatus } from '../types/desktopLyrics'
import type { PhoneRemoteStatus, RemoteCommand, RemoteLook, RemoteLyricLine, RemoteNowPlaying } from '../types/remote'

/**
 * Transport commands (play/pause, next, previous, seek) only ever follow something the listener
 * did. The preload sees every real (trusted) pointer and key event in the window and every action
 * that arrives from the tray, the taskbar buttons, the song card or the phone remote. A command
 * with neither in the last moment, and no named reason (the sleep timer ending, an album being
 * started), is refused in the main process. Every command is logged there with its origin.
 */
const INPUT_WINDOW_MS = 800
let lastTrustedInput = 0
let lastRemoteAction = 0
/** The last real input, named for the log: event type, key and the control it reached. */
let lastInputSource = ''
const describeTarget = (t: EventTarget | null): string => {
  if (!(t instanceof Element)) return '?'
  const el = t.closest('button, a, input, [role], [data-testid], [aria-label]') ?? t
  const name = el.getAttribute('aria-label') ?? el.getAttribute('data-testid') ?? el.id ?? ''
  return `${el.tagName.toLowerCase()}${name ? `[${name.slice(0, 40)}]` : ''}`
}
if (typeof window !== 'undefined') {
  const mark = (e: Event): void => {
    if (!e.isTrusted) return
    lastTrustedInput = Date.now()
    const key = e instanceof KeyboardEvent ? ` key=${e.key === ' ' ? 'Space' : e.key}` : ''
    lastInputSource = `${e.type}${key} on ${describeTarget(e.target)}`
  }
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'keyup', 'click']) {
    window.addEventListener(type, mark, true)
  }
}

export type CommandReason = 'sleep-timer' | 'album-start'

function commandOrigin(reason?: CommandReason): { allowed: boolean; why: string; user: boolean | null; from: string; source: string } {
  const now = Date.now()
  const input = now - lastTrustedInput < INPUT_WINDOW_MS
  const remote = now - lastRemoteAction < INPUT_WINDOW_MS
  const why = reason ?? (input ? 'input' : remote ? 'remote' : 'none')
  const user = typeof navigator !== 'undefined' && navigator.userActivation ? navigator.userActivation.isActive : null
  const from = (new Error().stack ?? '')
    .split(/\r?\n/)
    .slice(2, 6)
    .map((line) => line.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\//, '(').slice(0, 120))
    .join(' < ')
  return { allowed: why !== 'none', why, user, from, source: input ? lastInputSource : '' }
}

/** An album's sides, as the main process returns them (main/services/albumSides.ts). */
export interface AlbumSidesResult {
  kind: 'vinyl' | 'split' | 'single'
  sides: Array<{ letter: string; tracks: Array<{ title: string; length: number }> }>
}

export interface KissaSystemMediaAPI {
  getSystemMedia: () => Promise<SystemMediaPayload | null>
  getLyrics: (request: LyricsRequest) => Promise<LyricsResponse>
  searchLyrics: (request: LyricsRequest, query: string) => Promise<LyricsSearchResponse>
  chooseLyrics: (request: LyricsRequest, choice: LyricsChoice) => Promise<LyricsResponse | null>
  onSystemMediaUpdate: (callback: (data: SystemMediaPayload | null) => void) => () => void
  getVolume: () => Promise<{ master: number; isMuted: boolean } | null>
  mediaPlayPause: (reason?: CommandReason) => Promise<void>
  /** Asks for an album folder and reads it; its files become playable, read-only. */
  chooseAlbumFolder: () => Promise<LocalAlbumResult>
  /** Why a kissa-album:// track would not play. */
  albumTrackProblem: (url: string) => Promise<TrackProblem>
  mediaNext: () => Promise<void>
  mediaPrev: () => Promise<void>
  mediaSeek: (positionSeconds: number) => Promise<void>
  openExternal: (url: string) => Promise<void>
  getAppVersion: () => Promise<string>
  toggleMiniPlayer: (isMini: boolean, alwaysOnTop?: boolean) => Promise<void>
  setFullScreen: (value: boolean) => Promise<boolean>
  /** Start-up timeline marks (main/startupTiming.ts). */
  startupMark?: (name: string) => void
  /** The opening has drawn its first frame over the room: show the window; resolves once it is on screen. */
  openingReady?: () => Promise<void>
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void
  /** Kissa's own caption buttons (no native overlay). */
  windowControl?: (action: 'minimize' | 'toggle-maximize' | 'close') => Promise<void>
  getWindowMaximized?: () => Promise<boolean>
  onWindowMaximized?: (callback: (maximized: boolean) => void) => () => void
  onWindowVisibility: (callback: (visible: boolean) => void) => () => void
  onMiniHover: (callback: (inside: boolean) => void) => () => void
  getGraphics: () => Promise<{ hardwareAcceleration: boolean; activeNow: boolean }>
  setHardwareAcceleration: (on: boolean) => Promise<{ hardwareAcceleration: boolean; activeNow: boolean }>
  relaunchApp: () => Promise<void>
  syncSettings: (settings: any) => Promise<void>
  setStartup: (enabled: boolean) => Promise<void>
  setProgress: (progress: number, mode?: 'normal' | 'paused' | 'error' | 'none') => Promise<void>
  setThumbarButtons: (isPlaying: boolean) => Promise<void>
  onTrayAction: (callback: (action: string) => void) => () => void
  takeJumpPlace: () => Promise<string | null>
  getAlbumSides: (artist: string, album: string) => Promise<AlbumSidesResult | null>
  showTrackToast: (payload: { title: string; artist: string; artwork?: string; accent?: string; label?: string; playPauseLabel?: string; nextLabel?: string; playing?: boolean }) => Promise<boolean>
  setJumpList: (labels: Record<string, string>) => Promise<void>
  exportShare: (options: ShareExportOptions) => Promise<boolean>
  getSharePayload: () => Promise<SharePayload | null>
  sendShareReady: (success: boolean) => Promise<void>
  isScreensaver: () => Promise<boolean>
  exitScreensaver: () => Promise<void>
  onScreensaverModeChanged: (callback: (isScreensaver: boolean) => void) => () => void
  isScreensaverRegistered: () => Promise<boolean>
  registerScreensaver: () => Promise<{
    success: boolean
    error?: string
    path?: string
    manual?: boolean
  }>
  unregisterScreensaver: () => Promise<{
    success: boolean
    removed: boolean
    reason?: string
    currentPath?: string
    error?: string
  }>
  openScreensaverSettings: () => Promise<{ success: boolean; error?: string }>
  getUpdateStatus: () => Promise<UpdateStatusPayload>
  checkForUpdates: () => Promise<UpdateStatusPayload>
  downloadUpdate: () => Promise<UpdateStatusPayload>
  cancelUpdate: () => Promise<UpdateStatusPayload>
  installUpdate: () => Promise<UpdateInstallResult>
  openStorePage: () => Promise<void>
  openStoreReview: () => Promise<void>
  getReminders: () => Promise<unknown>
  setReminders: (state: unknown) => Promise<unknown>
  getSystemInfo: () => Promise<{ windows: string; arch: string }>
  onUpdateStatusChanged: (callback: (status: UpdateStatusPayload) => void) => () => void
  getDiscordPresence: () => Promise<DiscordPresenceStatus>
  setStudyKeepAwake: (on: boolean) => Promise<boolean>
  setDiscordPresenceEnabled: (enabled: boolean) => Promise<DiscordPresenceStatus>
  setDiscordShareSpotify: (on: boolean) => Promise<DiscordPresenceStatus>
  setDiscordShareStudy: (on: boolean) => Promise<DiscordPresenceStatus>
  setDiscordStudy: (study: StudyPresence | null) => void
  setDiscordShareYouTubeMusic: (on: boolean) => Promise<DiscordPresenceStatus>
  getYouTubeMusicConnector: () => Promise<YouTubeMusicConnectorStatus>
  beginYouTubeMusicPairing: () => Promise<YouTubeMusicConnectorStatus>
  cancelYouTubeMusicPairing: () => Promise<YouTubeMusicConnectorStatus>
  forgetYouTubeMusicConnector: () => Promise<YouTubeMusicConnectorStatus>
  onYouTubeMusicConnectorChanged: (callback: (status: YouTubeMusicConnectorStatus) => void) => () => void
  onDiscordPresenceChanged: (callback: (status: DiscordPresenceStatus) => void) => () => void
  getPhoneRemote: () => Promise<PhoneRemoteStatus>
  setPhoneRemoteOn: (on: boolean) => Promise<PhoneRemoteStatus>
  sendRemoteQueue: (snapshot: RemoteQueue) => void
  sendRemoteLook: (look: RemoteLook) => void
  sendRemoteNowPlaying: (snapshot: RemoteNowPlaying) => void
  sendRemoteLyrics: (track: { title: string; artist: string }, lines: RemoteLyricLine[]) => void
  onPhoneRemoteChanged: (callback: (status: PhoneRemoteStatus) => void) => () => void
  onRemoteCommand: (callback: (command: RemoteCommand) => void) => () => void
  getDesktopLyrics: () => Promise<DesktopLyricsStatus>
  setDesktopLyrics: (change: { enabled?: boolean; locked?: boolean; size?: DesktopLyricsSize }) => Promise<DesktopLyricsStatus>
  sendDesktopLyricsFrame: (frame: DesktopLyricsFrame) => void
  sendDesktopLyricsLabels: (labels: { lock: string; unlock: string; close: string; size: string }) => void
  onDesktopLyricsChanged: (callback: (status: DesktopLyricsStatus) => void) => () => void
}

// The main process sends an embedded cover once and then marks updates "unchanged".
// Keep the last one here and put it back, so the renderer always sees a whole payload.
let lastEmbeddedArtwork: string | undefined

function restoreArtwork(data: SystemMediaPayload | null): SystemMediaPayload | null {
  if (!data) return data
  if (data.artworkUnchanged) {
    return { ...data, artworkDataUrl: lastEmbeddedArtwork, artworkUnchanged: undefined }
  }
  if (data.artworkDataUrl?.startsWith('data:')) lastEmbeddedArtwork = data.artworkDataUrl
  return data
}

const kissaMediaAPI: KissaSystemMediaAPI = {
  getSystemMedia: () =>
    ipcRenderer
      .invoke('kissa:get-system-media')
      .then((data: SystemMediaPayload | null) => restoreArtwork(data)),
  getLyrics: (request) => ipcRenderer.invoke('kissa:get-lyrics', request),
  searchLyrics: (request, query) => ipcRenderer.invoke('kissa:search-lyrics', request, query),
  chooseLyrics: (request, choice) => ipcRenderer.invoke('kissa:choose-lyrics', request, choice),
  onSystemMediaUpdate: (callback) => {
    const handler = (_event: unknown, data: SystemMediaPayload | null): void => {
      callback(restoreArtwork(data))
    }
    ipcRenderer.on('kissa:system-media-update', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:system-media-update', handler)
    }
  },
  getVolume: () => ipcRenderer.invoke('kissa:get-volume'),
  mediaPlayPause: (reason?: CommandReason) => ipcRenderer.invoke('kissa:media-play-pause', commandOrigin(reason)),
  chooseAlbumFolder: () => ipcRenderer.invoke('kissa:album-choose'),
  albumTrackProblem: (url) => ipcRenderer.invoke('kissa:album-problem', url),
  mediaNext: () => ipcRenderer.invoke('kissa:media-next', commandOrigin()),
  mediaPrev: () => ipcRenderer.invoke('kissa:media-prev', commandOrigin()),
  mediaSeek: (positionSeconds: number) => ipcRenderer.invoke('kissa:media-seek', positionSeconds, commandOrigin()),
  openExternal: (url: string) => ipcRenderer.invoke('kissa:open-external', url),
  getAppVersion: () => ipcRenderer.invoke('kissa:get-app-version'),
  toggleMiniPlayer: (isMini: boolean, alwaysOnTop?: boolean) =>
    ipcRenderer.invoke('kissa:toggle-mini-player', isMini, alwaysOnTop),
  setFullScreen: (value: boolean) => ipcRenderer.invoke('kissa:set-fullscreen', value),
  startupMark: (name: string) => ipcRenderer.send('kissa:startup-mark', name, Date.now()),
  openingReady: () =>
    new Promise<void>((resolve) => {
      ipcRenderer.once('kissa:opening-shown', () => resolve())
      ipcRenderer.send('kissa:opening-ready')
    }),
  windowControl: (action) => ipcRenderer.invoke('kissa:window-control', action),
  getWindowMaximized: () => ipcRenderer.invoke('kissa:window-maximized'),
  onWindowMaximized: (callback) => {
    const handler = (_event: unknown, maximized: boolean): void => callback(maximized === true)
    ipcRenderer.on('kissa:window-maximized', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:window-maximized', handler)
    }
  },
  onFullscreenChanged: (callback) => {
    const handler = (_event: unknown, isFullscreen: boolean): void => {
      callback(isFullscreen)
    }
    ipcRenderer.on('kissa:fullscreen-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:fullscreen-changed', handler)
    }
  },
  onWindowVisibility: (callback) => {
    const handler = (_event: unknown, visible: boolean): void => callback(visible)
    ipcRenderer.on('kissa:window-visibility', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:window-visibility', handler)
    }
  },
  onMiniHover: (callback) => {
    const handler = (_event: unknown, inside: boolean): void => callback(inside === true)
    ipcRenderer.on('kissa:mini-hover', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:mini-hover', handler)
    }
  },
  getGraphics: () => ipcRenderer.invoke('kissa:get-graphics'),
  setHardwareAcceleration: (on) => ipcRenderer.invoke('kissa:set-graphics', on),
  relaunchApp: () => ipcRenderer.invoke('kissa:relaunch'),
  syncSettings: (settings) => ipcRenderer.invoke('kissa:sync-settings', settings),
  setStartup: (enabled) => ipcRenderer.invoke('kissa:set-startup', enabled),
  setProgress: (progress, mode) => ipcRenderer.invoke('kissa:set-progress', progress, mode),
  setThumbarButtons: (isPlaying) => ipcRenderer.invoke('kissa:set-thumbar', isPlaying),
  onTrayAction: (callback) => {
    const handler = (_event: unknown, action: string): void => {
      lastRemoteAction = Date.now()
      callback(action)
    }
    ipcRenderer.on('kissa:tray-action', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:tray-action', handler)
    }
  },
  takeJumpPlace: () => ipcRenderer.invoke('kissa:take-jump-place'),
  getAlbumSides: (artist, album) => ipcRenderer.invoke('kissa:album-sides', artist, album),
  showTrackToast: (payload) => ipcRenderer.invoke('kissa:show-track-toast', payload),
  setJumpList: (labels) => ipcRenderer.invoke('kissa:set-jump-list', labels),
  exportShare: (options) => ipcRenderer.invoke('kissa:export-share', options),
  getSharePayload: () => ipcRenderer.invoke('kissa:get-share-payload'),
  sendShareReady: (success) => ipcRenderer.invoke('kissa:share-ready', success),
  isScreensaver: () => ipcRenderer.invoke('kissa:is-screensaver'),
  exitScreensaver: () => ipcRenderer.invoke('kissa:exit-screensaver'),
  onScreensaverModeChanged: (callback) => {
    const handler = (_event: unknown, isScreensaver: boolean): void => {
      callback(isScreensaver)
    }
    ipcRenderer.on('kissa:screensaver-mode-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:screensaver-mode-changed', handler)
    }
  },
  isScreensaverRegistered: () => ipcRenderer.invoke('kissa:is-screensaver-registered'),
  registerScreensaver: () => ipcRenderer.invoke('kissa:register-screensaver'),
  unregisterScreensaver: () => ipcRenderer.invoke('kissa:unregister-screensaver'),
  openScreensaverSettings: () => ipcRenderer.invoke('kissa:open-screensaver-settings'),
  getUpdateStatus: () => ipcRenderer.invoke('kissa:get-update-status'),
  checkForUpdates: () => ipcRenderer.invoke('kissa:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('kissa:download-update'),
  cancelUpdate: () => ipcRenderer.invoke('kissa:cancel-update'),
  installUpdate: () => ipcRenderer.invoke('kissa:install-update'),
  openStorePage: () => ipcRenderer.invoke('kissa:open-store-page'),
  openStoreReview: () => ipcRenderer.invoke('kissa:open-store-review'),
  getReminders: () => ipcRenderer.invoke('kissa:reminders-get'),
  setReminders: (state) => ipcRenderer.invoke('kissa:reminders-set', state),
  getSystemInfo: () => ipcRenderer.invoke('kissa:system-info'),
  onUpdateStatusChanged: (callback) => {
    const handler = (_event: unknown, status: UpdateStatusPayload): void => {
      callback(status)
    }
    ipcRenderer.on('kissa:update-status-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:update-status-changed', handler)
    }
  },
  getDiscordPresence: () => ipcRenderer.invoke('kissa:discord-get-status'),
  setStudyKeepAwake: (on) => ipcRenderer.invoke('kissa:study-keep-awake', on),
  setDiscordPresenceEnabled: (enabled) => ipcRenderer.invoke('kissa:discord-set-enabled', enabled),
  setDiscordShareSpotify: (on) => ipcRenderer.invoke('kissa:discord-set-share-spotify', on),
  setDiscordShareStudy: (on) => ipcRenderer.invoke('kissa:discord-set-share-study', on),
  setDiscordStudy: (study) => ipcRenderer.send('kissa:discord-study', study),
  setDiscordShareYouTubeMusic: (on) => ipcRenderer.invoke('kissa:discord-set-share-ytmusic', on),
  getYouTubeMusicConnector: () => ipcRenderer.invoke('kissa:ytmusic-status'),
  beginYouTubeMusicPairing: () => ipcRenderer.invoke('kissa:ytmusic-begin-pairing'),
  cancelYouTubeMusicPairing: () => ipcRenderer.invoke('kissa:ytmusic-cancel-pairing'),
  forgetYouTubeMusicConnector: () => ipcRenderer.invoke('kissa:ytmusic-forget'),
  onYouTubeMusicConnectorChanged: (callback) => {
    const handler = (_event: unknown, status: YouTubeMusicConnectorStatus): void => callback(status)
    ipcRenderer.on('kissa:ytmusic-status-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:ytmusic-status-changed', handler)
    }
  },
  onDiscordPresenceChanged: (callback) => {
    const handler = (_event: unknown, status: DiscordPresenceStatus): void => callback(status)
    ipcRenderer.on('kissa:discord-status-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:discord-status-changed', handler)
    }
  },
  getPhoneRemote: () => ipcRenderer.invoke('kissa:remote-status'),
  setPhoneRemoteOn: (on) => ipcRenderer.invoke('kissa:remote-set-on', on),
  sendRemoteQueue: (snapshot) => ipcRenderer.send('kissa:remote-queue', snapshot),
  sendRemoteLook: (look) => ipcRenderer.send('kissa:remote-look', look),
  sendRemoteNowPlaying: (snapshot) => ipcRenderer.send('kissa:remote-now-playing', snapshot),
  sendRemoteLyrics: (track, lines) => ipcRenderer.send('kissa:remote-lyrics', track, lines),
  onPhoneRemoteChanged: (callback) => {
    const handler = (_event: unknown, status: PhoneRemoteStatus): void => callback(status)
    ipcRenderer.on('kissa:remote-status-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:remote-status-changed', handler)
    }
  },
  onRemoteCommand: (callback) => {
    const handler = (_event: unknown, command: RemoteCommand): void => {
      lastRemoteAction = Date.now()
      callback(command)
    }
    ipcRenderer.on('kissa:remote-command', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:remote-command', handler)
    }
  },
  getDesktopLyrics: () => ipcRenderer.invoke('kissa:desktop-lyrics-status'),
  setDesktopLyrics: (change) => ipcRenderer.invoke('kissa:desktop-lyrics-set', change),
  sendDesktopLyricsFrame: (frame) => ipcRenderer.send('kissa:desktop-lyrics-frame', frame),
  sendDesktopLyricsLabels: (labels) => ipcRenderer.send('kissa:desktop-lyrics-labels', labels),
  onDesktopLyricsChanged: (callback) => {
    const handler = (_event: unknown, status: DesktopLyricsStatus): void => callback(status)
    ipcRenderer.on('kissa:desktop-lyrics-changed', handler)
    return (): void => {
      ipcRenderer.removeListener('kissa:desktop-lyrics-changed', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electron', {
  ...kissaMediaAPI
})
