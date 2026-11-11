import { BrowserWindow, ipcMain, shell, app as electronApp } from 'electron'
import { exec } from 'child_process'
import { SMTCMonitor, PlaybackStatus, type MediaInfo } from '@coooookies/windows-smtc-monitor'
import type { SystemMediaPayload } from '../../types/media'
import type { LyricsRequest } from '../../types/lyrics'
import { LyricsService } from './LyricsService'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { ScreensaverSessionService } from './ScreensaverSessionService'
import { DiagnosticsLog } from './DiagnosticsLog'

function sendMediaKey(keyCode: number): void {
  try {
    exec(
      `powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]${keyCode})"`
    )
  } catch (err) {
    console.warn('[MediaDetectionService] Failed to send media key:', err)
  }
}

function getCleanAppName(sourceAppId: string): string {
  if (!sourceAppId) return 'Media Player'
  const lower = sourceAppId.toLowerCase()
  if (lower.includes('applemusic') || lower.includes('apple music') || lower.includes('itunes')) {
    return 'Apple Music'
  }
  if (lower.includes('spotify')) {
    return 'Spotify'
  }
  if (lower.includes('tidal')) {
    return 'TIDAL'
  }
  if (lower.includes('chrome')) {
    return 'Chrome'
  }
  if (lower.includes('msedge') || lower.includes('edge')) {
    return 'Microsoft Edge'
  }
  if (lower.includes('firefox')) {
    return 'Firefox'
  }
  if (lower.includes('brave')) {
    return 'Brave'
  }
  if (lower.includes('opera')) {
    return 'Opera'
  }
  if (lower.includes('vivaldi')) {
    return 'Vivaldi'
  }
  if (lower.includes('arc')) {
    return 'Arc'
  }
  if (lower.includes('comet')) {
    return 'Browser'
  }
  if (lower.includes('youtube')) {
    return 'YouTube'
  }
  if (lower.includes('zunemusic')) {
    return 'Media Player'
  }
  if (lower.includes('zunevideo')) {
    return 'Films & TV'
  }
  if (lower.includes('foobar')) {
    return 'foobar2000'
  }
  // Packaged apps identify themselves as "Publisher.AppName_hash!Id".
  if (sourceAppId.includes('!')) {
    const family = sourceAppId.split('!')[0].replace(/_[a-z0-9]{10,}$/i, '')
    const name = family.split('.').pop() || family
    return name.replace(/([a-z])([A-Z])/g, '$1 $2')
  }
  const filename = sourceAppId.split(/[\\/]/).pop() || sourceAppId
  return filename.replace(/\.(exe|appx)$/i, '')
}

function normalizeTime(raw: number | undefined | null): number {
  if (!raw || raw <= 0 || !Number.isFinite(raw)) return 0
  if (raw >= 10_000_000) {
    return raw / 10_000_000
  }
  // If between 86,400 (1 day in seconds) and 10 million, likely in milliseconds
  if (raw > 86_400) {
    return raw / 1000
  }
  return raw
}

import { ArtworkService } from './ArtworkService'
import { judgeCover, type CoverOwner } from './coverOwnership'
import { HelperRestartPolicy } from '../helperRestartPolicy'

/** What the preload says about where a transport command came from (preload/index.ts). */
interface CommandOrigin {
  allowed?: boolean
  why?: string
  user?: boolean | null
  from?: string
  /** The last real input before the command: event type, key and the control (preload). */
  source?: string
}

/**
 * Every play/pause/next/previous/seek Kissa sends to another player is logged with its origin,
 * and refused unless the listener just did something (a click, a key, a tray or phone action) or
 * a named reason applies (the sleep timer, starting an album). Kissa must never drive someone's
 * music on its own.
 */
function allowCommand(action: string, origin: CommandOrigin | undefined): boolean {
  const allowed = origin?.allowed === true
  const line = `[media-cmd] ${new Date().toISOString()} ${allowed ? 'SENT' : 'REFUSED'} ${action} why=${origin?.why ?? 'unknown'} user=${origin?.user ?? 'n/a'}${origin?.source ? ` input=${String(origin.source).slice(0, 100)}` : ''} from=${origin?.from ?? 'n/a'}`
  if (allowed) console.log(line)
  else {
    console.warn(line)
    DiagnosticsLog.get()?.record('media-cmd-refused', { action: action.split(' ')[0] })
  }
  return allowed
}

/** The last cover the helper sent. It only resends the image when it changes. */
let lastThumbnailDataUrl: string | undefined
/** The last player cover accepted as a track's own, and that track. */
let lastCoverOwner: CoverOwner | undefined
/** The track now playing (title, artist, album, player) and when it started. */
let currentTrackKey = ''
let currentTrackSince = 0

/** Forget what the previous helper sent (a restarted helper starts from scratch). */
export function resetHelperCoverState(): void {
  lastThumbnailDataUrl = undefined
  lastCoverOwner = undefined
  currentTrackKey = ''
  currentTrackSince = 0
}

function formatSession(
  session: any,
  volumeInfo?: { master?: number; isMuted?: boolean },
  sampledAt?: number
): SystemMediaPayload | null {
  const masterVol = volumeInfo?.master !== undefined ? volumeInfo.master : 100
  const isMuted = volumeInfo?.isMuted ?? false

  if (!session || !session.media) return null

  // If the session is explicitly Closed (0) or Stopped (3), treat it as cleared.
  // This prevents zombie sessions from closed browsers persisting in the UI.
  if (
    session.playback &&
    (session.playback.playbackStatus === 0 || session.playback.playbackStatus === 3)
  ) {
    return null
  }

  let artworkDataUrl: string | undefined = undefined

  const thumbBase64 = session.media.thumbnailBase64
  if (typeof thumbBase64 === 'string' && thumbBase64.length > 20 && thumbBase64 !== 'null') {
    const isPng = thumbBase64.startsWith('iVBORw0KGgo')
    const mime = isPng ? 'image/png' : 'image/jpeg'
    artworkDataUrl = `data:${mime};base64,${thumbBase64}`
    lastThumbnailDataUrl = artworkDataUrl
  } else if (session.media.thumbnailUnchanged === true && lastThumbnailDataUrl) {
    artworkDataUrl = lastThumbnailDataUrl
  } else if (session.media.thumbnail) {
    try {
      const buf = Buffer.isBuffer(session.media.thumbnail)
        ? session.media.thumbnail
        : Buffer.from(session.media.thumbnail)
      if (buf.length > 0) {
        const isPng = buf[0] === 0x89 && buf[1] === 0x50
        const mime = isPng ? 'image/png' : 'image/jpeg'
        artworkDataUrl = `data:${mime};base64,${buf.toString('base64')}`
      }
    } catch {
      artworkDataUrl = undefined
    }
  }

  let title = (session.media.title || '').trim()

  // If the session has no title, consider it an empty/uninitialized session.
  // Apple Music and Spotify often create these when launched but not playing.
  if (!title) return null

  let artist = (session.media.artist || '').trim() || 'Unknown Artist'
  let album = (session.media.albumTitle || '').trim()

  if (artist.includes(' — ')) {
    const parts = artist.split(' — ')
    artist = parts[0].trim()
    if (!album || album === title) {
      album = parts.slice(1).join(' — ').trim()
    }
  } else if (artist.includes(' - ')) {
    const parts = artist.split(' - ')
    if (parts[0].length > 1 && parts[1].length > 1) {
      artist = parts[0].trim()
      if (!album || album === title) {
        album = parts.slice(1).join(' - ').trim()
      }
    }
  }

  // The player's own cover is what the listener sees in their player. A sharper catalogue
  // copy replaces it only once it has been confirmed to be the same picture (many albums
  // have different art on different services). Without a cover from the player, the best
  // match found for the track is used.
  const artwork = ArtworkService.getInstance()
  let publicArtworkUrl: string | undefined
  let rememberCover = true
  const trackKey = `${title}|${artist}|${album}|${session.sourceAppId ?? ''}`.toLowerCase()
  if (trackKey !== currentTrackKey) {
    currentTrackKey = trackKey
    currentTrackSince = Date.now()
  }
  if (artworkDataUrl?.startsWith('data:')) {
    const verdict = judgeCover(
      lastCoverOwner,
      { cover: artworkDataUrl, title, artist, album },
      Date.now() - currentTrackSince
    )
    if (verdict === 'stale') artworkDataUrl = undefined
    else if (verdict === 'unproven') rememberCover = false
    else lastCoverOwner = { cover: artworkDataUrl, title, artist, album }
  }
  if (artworkDataUrl) {
    publicArtworkUrl = artwork.getPublicArtwork(title, artist, album, artworkDataUrl)
    const verified = artwork.getVerifiedArtwork(title, artist, album, artworkDataUrl)
    if (verified) artworkDataUrl = verified
    else if (rememberCover) artwork.setCachedArtwork(title, artist, artworkDataUrl, album)
  } else {
    const cachedArtwork = artwork.getCachedArtwork(title, artist, album)
    if (cachedArtwork) artworkDataUrl = cachedArtwork
  }
  if (!publicArtworkUrl && artworkDataUrl?.startsWith('https://')) publicArtworkUrl = artworkDataUrl

  const isPlaying = session.playback?.playbackStatus === PlaybackStatus.PLAYING // 4

  return {
    sourceAppId: session.sourceAppId,
    sourceAppName: getCleanAppName(session.sourceAppId),
    title,
    artist,
    album,
    artworkDataUrl,
    ...(publicArtworkUrl ? { publicArtworkUrl } : {}),
    isPlaying,
    canSeek: session.playback?.canSeek !== false,
    progress: Math.max(0, normalizeTime(session.timeline?.position || 0)),
    duration: Math.max(0, normalizeTime(session.timeline?.duration || 0)),
    // When the position was sampled (helper clock, same machine). The renderer uses it
    // to account for the time the message spent in transit.
    lastUpdatedTime: sampledAt || session.lastUpdatedTime || Date.now(),
    volume: masterVol,
    isMuted
  }
}

export type VideoPlaybackState = 'detected' | 'not_detected' | 'unknown'

export class MediaDetectionService {
  private static instance: MediaDetectionService
  private static readonly FRESHNESS_WINDOW_MS = 3000
  private worker: Worker | null = null
  private handlersRegistered = false
  private readonly workerRestarts = new HelperRestartPolicy()
  private latestPayload: SystemMediaPayload | null = null
  private lastPayloadJson: string | null = null
  /** Embedded cover last sent to each window, so position updates do not carry it again. */
  private readonly artworkSentTo = new Map<number, string>()
  /** Pages whose reloads are watched, so their record of the sent cover can be reset. */
  private readonly watchedContents = new Set<number>()
  private latestVolume: { master: number; isMuted: boolean } = { master: 100, isMuted: false }
  private videoPlaybackState: VideoPlaybackState = 'unknown'
  private lastUpdateTimestamp: number = 0
  private isWorkerHealthy: boolean = false
  private isInternalAudioPlaying: boolean = false
  private readonly payloadListeners = new Set<(payload: SystemMediaPayload | null) => void>()

  private constructor() {}

  public static getInstance(): MediaDetectionService {
    if (!MediaDetectionService.instance) {
      MediaDetectionService.instance = new MediaDetectionService()
    }
    return MediaDetectionService.instance
  }

  public getVideoPlaybackState(): VideoPlaybackState {
    if (
      !this.isWorkerHealthy ||
      Date.now() - this.lastUpdateTimestamp > MediaDetectionService.FRESHNESS_WINDOW_MS
    ) {
      return 'unknown'
    }
    return this.videoPlaybackState
  }

  public isMusicPlaying(): boolean {
    if (this.isInternalAudioPlaying) {
      return true
    }

    if (
      !this.isWorkerHealthy ||
      Date.now() - this.lastUpdateTimestamp > MediaDetectionService.FRESHNESS_WINDOW_MS
    ) {
      return false
    }

    if (!this.latestPayload || !this.latestPayload.isPlaying) {
      return false
    }

    const title = this.latestPayload.title?.trim()
    if (!title) {
      return false
    }

    const sourceAppId = this.latestPayload.sourceAppId?.toLowerCase() || ''
    const isBrowserSource =
      sourceAppId.includes('chrome') ||
      sourceAppId.includes('edge') ||
      sourceAppId.includes('msedge') ||
      sourceAppId.includes('firefox') ||
      sourceAppId.includes('brave') ||
      sourceAppId.includes('opera') ||
      sourceAppId.includes('vivaldi') ||
      sourceAppId.includes('arc')

    if (isBrowserSource && this.videoPlaybackState !== 'not_detected') {
      return false
    }

    return true
  }

  public setInternalAudioPlaying(isPlaying: boolean): void {
    if (this.isInternalAudioPlaying !== isPlaying) {
      this.isInternalAudioPlaying = isPlaying
      ScreensaverSessionService.getInstance().onPlaybackStateChanged(
        this.isMusicPlaying(),
        this.getVideoPlaybackState()
      )
    }
  }

  public hasActiveVideo(): boolean {
    return this.getVideoPlaybackState() !== 'not_detected'
  }

  public getLatestPayload(): SystemMediaPayload | null {
    return this.latestPayload
  }

  /** The PC's volume as the helper last reported it; null while the helper is not running. */
  public getVolume(): { master: number; isMuted: boolean } | null {
    return this.worker ? { ...this.latestVolume } : null
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    this.latestVolume.master = clamped
    if (this.worker) {
      try {
        this.worker.postMessage({ action: 'setVolume', volume: clamped })
      } catch (err) {
        console.warn('[MediaDetectionService] Failed to send setVolume to worker:', err)
      }
    }
  }

  public start(): void {
    if (this.worker) return
    // A respawned worker (see the 'exit' handler) reuses the handlers registered the first time.
    if (!this.handlersRegistered) {
    this.handlersRegistered = true

    // Lyrics found earlier are kept in the profile so they show at once after a restart.
    LyricsService.configure({
      cacheFile: join(electronApp.getPath('userData'), 'lyrics-cache.json'),
      overridesFile: join(electronApp.getPath('userData'), 'lyrics-choices.json'),
      appVersion: electronApp.getVersion()
    })

    ipcMain.handle('kissa:get-system-media', (event) => {
      const artwork = this.latestPayload?.artworkDataUrl
      if (artwork && artwork.startsWith('data:')) this.artworkSentTo.set(event.sender.id, artwork)
      return this.latestPayload
    })

    ipcMain.handle('kissa:get-lyrics', (_event, request: LyricsRequest) => {
      return LyricsService.getInstance().getLyrics(request)
    })
    ipcMain.handle('kissa:search-lyrics', (_event, request: LyricsRequest, query: string) =>
      LyricsService.getInstance().searchCandidates(request, query)
    )
    ipcMain.handle(
      'kissa:choose-lyrics',
      (_event, request: LyricsRequest, choice: import('../../types/lyrics').LyricsChoice) =>
        LyricsService.getInstance().chooseLyrics(request, choice)
    )

    ipcMain.handle('kissa:set-volume', (_event, vol: number) => {
      this.setVolume(vol)
    })

    ipcMain.handle('kissa:get-volume', () => {
      return this.latestVolume
    })

    ipcMain.handle('kissa:media-play-pause', (_event, origin?: CommandOrigin) => {
      if (!allowCommand('playPause', origin)) return
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'playPause' })
      } else {
        sendMediaKey(179)
      }
    })

    ipcMain.handle('kissa:media-next', (_event, origin?: CommandOrigin) => {
      if (!allowCommand('next', origin)) return
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'next' })
      } else {
        sendMediaKey(176)
      }
    })

    ipcMain.handle('kissa:media-prev', (_event, origin?: CommandOrigin) => {
      if (!allowCommand('prev', origin)) return
      if (this.worker && this.latestPayload) {
        this.worker.postMessage({ action: 'prev' })
      } else {
        sendMediaKey(177)
      }
    })

    ipcMain.handle('kissa:media-seek', (_event, positionSeconds: number, origin?: CommandOrigin) => {
      if (!allowCommand(`seek ${Math.round(Number(positionSeconds))}`, origin)) return
      if (
        typeof positionSeconds !== 'number' ||
        isNaN(positionSeconds) ||
        !isFinite(positionSeconds) ||
        positionSeconds < 0
      ) {
        return
      }
      if (this.worker && this.latestPayload) {
        let clamped = positionSeconds
        if (this.latestPayload.duration && this.latestPayload.duration > 0) {
          clamped = Math.min(clamped, this.latestPayload.duration)
        }
        this.worker.postMessage({ action: 'seek', position: clamped })
      }
    })

    ipcMain.handle('kissa:open-external', (_event, url: string) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url)
      }
    })

    ipcMain.handle('kissa:get-app-version', () => {
      return electronApp.getVersion()
    })
    }

    try {
      console.log('[MediaDetectionService] Resolving absolute path to SMTC helper...')

      let helperPath = ''
      if (electronApp.isPackaged) {
        helperPath = join(process.resourcesPath, 'smtc-helper.exe')
      } else {
        helperPath = join(electronApp.getAppPath(), 'resources', 'smtc-helper.exe')
      }

      console.log(`[MediaDetectionService] Resolved helper path: ${helperPath}`)

      const worker = new Worker(join(__dirname, 'smtcWorker.js'), {
        workerData: { helperPath }
      })
      this.worker = worker

      this.worker.on('message', (msg) => {
        if (msg.type === 'update') {
          this.isWorkerHealthy = true
          this.lastUpdateTimestamp = Date.now()

          if (
            msg.videoState === 'detected' ||
            msg.videoState === 'not_detected' ||
            msg.videoState === 'unknown'
          ) {
            this.videoPlaybackState = msg.videoState
          } else if (typeof msg.hasActiveVideoPlayback === 'boolean') {
            this.videoPlaybackState = msg.hasActiveVideoPlayback ? 'detected' : 'not_detected'
          }

          if (msg.volume) {
            this.latestVolume = {
              master: msg.volume.master ?? 100,
              isMuted: msg.volume.isMuted ?? false
            }
          }
          this.processSessionUpdate(msg.session, msg.volume, msg.timestamp)
          ScreensaverSessionService.getInstance().onPlaybackStateChanged(
            this.isMusicPlaying(),
            this.getVideoPlaybackState()
          )
        } else if (msg.type === 'helper-exit') {
          // Only the exit code and signal: enough to match a Windows crash report, nothing
          // about what was playing.
          console.warn(
            `[MediaDetectionService] Media helper stopped (exit ${msg.exitCode ?? 'none'}, signal ${msg.signal ?? 'none'}); ` +
              (msg.restartInMs === null ? 'not restarting again this session.' : `restarting in ${msg.restartInMs} ms.`)
          )
          DiagnosticsLog.get()?.record('helper-exit', {
            exitCode: msg.exitCode,
            signal: msg.signal,
            restartInMs: msg.restartInMs
          })
          resetHelperCoverState()
          this.isWorkerHealthy = false
          this.videoPlaybackState = 'unknown'
          ScreensaverSessionService.getInstance().onPlaybackStateChanged(
            this.isMusicPlaying(),
            this.getVideoPlaybackState()
          )
        } else if (msg.type === 'error') {
          console.warn('[MediaDetectionService] Worker reported error:', msg.error)
          this.videoPlaybackState = 'unknown'
          ScreensaverSessionService.getInstance().onPlaybackStateChanged(
            this.isMusicPlaying(),
            this.getVideoPlaybackState()
          )
        }
      })

      this.worker.on('error', (err) => {
        console.error('[MediaDetectionService] Worker threw error:', err)
        this.isWorkerHealthy = false
        this.videoPlaybackState = 'unknown'
        ScreensaverSessionService.getInstance().onPlaybackStateChanged(
          this.isMusicPlaying(),
          this.getVideoPlaybackState()
        )
      })

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[MediaDetectionService] Worker stopped with exit code ${code}`)
        }
        // A worker that died on its own is started again, with the helper's own limits (a few
        // tries, growing waits), instead of leaving Kissa deaf to the music until it restarts.
        if (code !== 0 && this.worker === worker) {
          this.worker = null
          const delay = this.workerRestarts.nextDelay(Date.now())
          DiagnosticsLog.get()?.record('worker-exit', { code, restartInMs: delay })
          if (delay !== null) setTimeout(() => this.start(), delay)
        }
        this.isWorkerHealthy = false
        this.videoPlaybackState = 'unknown'
        ScreensaverSessionService.getInstance().onPlaybackStateChanged(
          this.isMusicPlaying(),
          this.getVideoPlaybackState()
        )
      })

      console.log('[MediaDetectionService] SMTC worker spawned successfully.')
    } catch (err) {
      console.warn('[MediaDetectionService] Could not launch SMTC worker:', err)
    }
  }

  private processSessionUpdate(
    session: MediaInfo | null,
    volumeInfo?: { master?: number; isMuted?: boolean },
    sampledAt?: number
  ): void {
    const payload = formatSession(session, volumeInfo || this.latestVolume, sampledAt)

    // The player's own picture, if it sent one (formatSession already swapped in a verified
    // sharper copy where there is one).
    const ownCover = payload?.artworkDataUrl?.startsWith('data:')
      ? payload.artworkDataUrl
      : undefined

    // Without a cover from the player, keep the web cover already found for this track.
    if (
      this.latestPayload &&
      payload &&
      !payload.artworkDataUrl &&
      this.latestPayload.title?.trim().toLowerCase() === payload.title?.trim().toLowerCase() &&
      this.latestPayload.artist?.trim().toLowerCase() === payload.artist?.trim().toLowerCase() &&
      (this.latestPayload.album || '').trim().toLowerCase() ===
        (payload.album || '').trim().toLowerCase() &&
      this.latestPayload.artworkDataUrl?.startsWith('http')
    ) {
      payload.artworkDataUrl = this.latestPayload.artworkDataUrl
    }

    const json = JSON.stringify(payload)
    if (json !== this.lastPayloadJson) {
      this.lastPayloadJson = json
      this.latestPayload = payload
      this.broadcast(payload)
    }

    const needsWebArtwork = !payload?.artworkDataUrl || payload.artworkDataUrl.startsWith('data:')
    if (payload && payload.title && payload.artist && needsWebArtwork) {
      const currentTitle = payload.title
      const currentArtist = payload.artist
      const currentAlbum = payload.album || ''
      const currentSource = payload.sourceAppId
      ArtworkService.getInstance()
        .fetchArtworkFor(payload.title, payload.artist, payload.album, ownCover)
        .then((fetchedUrl) => {
          const latest = this.latestPayload
          // A lookup answers for one recording from one player: another edition of the
          // song, or the same song in another app, must not take this result.
          if (
            !latest ||
            latest.title !== currentTitle ||
            latest.artist !== currentArtist ||
            (latest.album || '') !== currentAlbum ||
            latest.sourceAppId !== currentSource
          )
            return
          // Only the very picture that was checked, not a newer cover that arrived meanwhile.
          const samePicture =
            ownCover === undefined
              ? !latest.artworkDataUrl?.startsWith('data:')
              : latest.artworkDataUrl === ownCover
          if (!samePicture) return
          const publicArtworkUrl =
            fetchedUrl ??
            (ownCover
              ? ArtworkService.getInstance().getPublicArtwork(
                  currentTitle,
                  currentArtist,
                  latest.album,
                  ownCover
                )
              : undefined)
          const next = {
            ...latest,
            ...(fetchedUrl ? { artworkDataUrl: fetchedUrl } : {}),
            ...(publicArtworkUrl ? { publicArtworkUrl } : {})
          }
          const json = JSON.stringify(next)
          if (json === this.lastPayloadJson) return
          this.latestPayload = next
          this.lastPayloadJson = json
          this.broadcast(next)
        })
        .catch(() => {})
    }
  }

  /** Main-process consumers (Discord presence) get the same updates the windows do. */
  public onPayload(listener: (payload: SystemMediaPayload | null) => void): () => void {
    this.payloadListeners.add(listener)
    return () => this.payloadListeners.delete(listener)
  }

  private broadcast(payload: SystemMediaPayload | null): void {
    for (const listener of this.payloadListeners) {
      try {
        listener(payload)
      } catch (err) {
        console.warn('[MediaDetectionService] Media listener failed:', err)
      }
    }
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (win.isDestroyed() || !win.webContents) continue
      const id = win.webContents.id
      const artwork = payload?.artworkDataUrl
      if (!this.watchedContents.has(id)) {
        // A reloaded page (or a renderer restarted after a crash) has lost the cover it
        // was sent, so it must be sent in full again rather than marked "unchanged".
        this.watchedContents.add(id)
        const contents = win.webContents
        contents.on('did-start-loading', () => this.artworkSentTo.delete(id))
        contents.once('destroyed', () => {
          this.artworkSentTo.delete(id)
          this.watchedContents.delete(id)
        })
      }

      // An embedded cover can be hundreds of kilobytes. Send it once per window and
      // mark later updates "unchanged"; the preload bridge puts it back.
      if (payload && artwork && artwork.startsWith('data:')) {
        if (this.artworkSentTo.get(id) === artwork) {
          win.webContents.send('kissa:system-media-update', {
            ...payload,
            artworkDataUrl: undefined,
            artworkUnchanged: true
          })
          continue
        }
        this.artworkSentTo.set(id, artwork)
      } else {
        this.artworkSentTo.delete(id)
      }
      win.webContents.send('kissa:system-media-update', payload)
    }
  }

  public stop(): void {
    LyricsService.getInstance().flush()
    this.isWorkerHealthy = false
    this.videoPlaybackState = 'unknown'
    if (this.worker) {
      try {
        this.worker.postMessage('stop')
        this.worker.terminate()
      } catch {}
      this.worker = null
    }
    // The handlers are removed below, so a later start() registers them again.
    this.handlersRegistered = false
    if (ipcMain && typeof ipcMain.removeHandler === 'function') {
      ipcMain.removeHandler('kissa:get-system-media')
      ipcMain.removeHandler('kissa:get-lyrics')
      ipcMain.removeHandler('kissa:search-lyrics')
      ipcMain.removeHandler('kissa:choose-lyrics')
      ipcMain.removeHandler('kissa:set-volume')
      ipcMain.removeHandler('kissa:get-volume')
      ipcMain.removeHandler('kissa:media-play-pause')
      ipcMain.removeHandler('kissa:media-next')
      ipcMain.removeHandler('kissa:media-prev')
      ipcMain.removeHandler('kissa:media-seek')
      ipcMain.removeHandler('kissa:open-external')
      ipcMain.removeHandler('kissa:get-app-version')
    }
  }
}
