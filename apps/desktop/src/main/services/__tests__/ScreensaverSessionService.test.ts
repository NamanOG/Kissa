import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ScreensaverSessionService,
  getScreensaverPipePath
} from '../ScreensaverSessionService'
import { WindowManager } from '../../window/WindowManager'
import { MediaDetectionService, type VideoPlaybackState } from '../MediaDetectionService'

describe('ScreensaverSessionService', () => {
  let service: ScreensaverSessionService
  let mockMainWindow: any
  let isMusicPlaying = true
  let videoState: VideoPlaybackState = 'not_detected'

  beforeEach(() => {
    service = ScreensaverSessionService.getInstance()
    service.stop()

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      isVisible: vi.fn(() => true),
      isFullScreen: vi.fn(() => false),
      getBounds: vi.fn(() => ({ x: 100, y: 100, width: 900, height: 670 })),
      setBounds: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      restore: vi.fn(),
      maximize: vi.fn(),
      setFullScreen: vi.fn(),
      webContents: {
        send: vi.fn()
      }
    }

    vi.spyOn(WindowManager.getInstance(), 'getMainWindow').mockReturnValue(mockMainWindow as any)
    vi.spyOn(WindowManager.getInstance(), 'enterScreensaverMode').mockImplementation(() => {
      mockMainWindow.setFullScreen(true)
      return true
    })
    vi.spyOn(WindowManager.getInstance(), 'exitScreensaverMode').mockImplementation(() => {
      mockMainWindow.setFullScreen(false)
    })

    isMusicPlaying = true
    videoState = 'not_detected'

    vi.spyOn(MediaDetectionService.getInstance(), 'isMusicPlaying').mockImplementation(() => isMusicPlaying)
    vi.spyOn(MediaDetectionService.getInstance(), 'getVideoPlaybackState').mockImplementation(() => videoState)
  })

  afterEach(() => {
    service.stop()
    vi.restoreAllMocks()
  })

  describe('getScreensaverPipePath', () => {
    it('generates a valid Windows named pipe path with username hash', () => {
      const pipePath = getScreensaverPipePath()
      expect(pipePath).toMatch(/^\\\\\.\\pipe\\kissa-screensaver-[0-9a-f]{16}$/)
    })

    it('produces consistent named pipe paths across multiple calls for the same user', () => {
      const pipe1 = getScreensaverPipePath()
      const pipe2 = getScreensaverPipePath()
      expect(pipe1).toBe(pipe2)
    })
  })

  describe('isActivationEligible gating', () => {
    it('approves activation when music is actively playing and no video is detected', () => {
      isMusicPlaying = true
      videoState = 'not_detected'

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('fails closed when music is not playing (paused, stopped, or empty title)', () => {
      isMusicPlaying = false
      videoState = 'not_detected'

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('not_playing')
    })

    it('fails closed when external video playback or busy presentation mode is detected', () => {
      isMusicPlaying = true
      videoState = 'detected'

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('video_playback_active')
    })

    it('fails closed when media state is unknown, unverified, or stale', () => {
      isMusicPlaying = true
      videoState = 'unknown'

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('media_state_unknown')
    })

    it('fails closed if the main window is unavailable or destroyed', () => {
      isMusicPlaying = true
      videoState = 'not_detected'
      vi.spyOn(WindowManager.getInstance(), 'getMainWindow').mockReturnValue(null)

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('window_unavailable')
    })

    it('fails closed if the main window is destroyed', () => {
      isMusicPlaying = true
      videoState = 'not_detected'
      mockMainWindow.isDestroyed.mockReturnValue(true)

      const result = service.isActivationEligible()
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('window_unavailable')
    })

    it('rejects activation when client reports foreground process is a browser or video player', () => {
      isMusicPlaying = true
      videoState = 'not_detected'

      const chromeResult = service.isActivationEligible('chrome')
      expect(chromeResult.eligible).toBe(false)
      expect(chromeResult.reason).toBe('foreground_video_or_browser')

      const vlcResult = service.isActivationEligible('vlc')
      expect(vlcResult.eligible).toBe(false)
      expect(vlcResult.reason).toBe('foreground_video_or_browser')

      const edgeResult = service.isActivationEligible('msedge')
      expect(edgeResult.eligible).toBe(false)
      expect(edgeResult.reason).toBe('foreground_video_or_browser')
    })

    it('rejects activation when client reports foreground process is unknown', () => {
      isMusicPlaying = true
      videoState = 'not_detected'

      const result = service.isActivationEligible('unknown')
      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('foreground_process_unknown')
    })

    it('allows activation when client reports foreground process is Kissa or non-media app', () => {
      isMusicPlaying = true
      videoState = 'not_detected'

      const kissaResult = service.isActivationEligible('kissa')
      expect(kissaResult.eligible).toBe(true)

      const notepadResult = service.isActivationEligible('notepad')
      expect(notepadResult.eligible).toBe(true)
    })
  })

  describe('session lifecycle and transitions', () => {
    it('activates screensaver session and assigns unique session token', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn() }
      const entered = service.enterScreensaverMode(fakeSocket)

      expect(entered).toBe(true)
      expect(service.isScreensaverActive()).toBe(true)
      expect(service.getSessionToken()).toBeTruthy()
      expect(WindowManager.getInstance().enterScreensaverMode).toHaveBeenCalledTimes(1)
    })

    it('exits screensaver mode, clears token, and sends wake to active socket', () => {
      const fakeSocket: any = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
        destroyed: false
      }
      service.enterScreensaverMode(fakeSocket)
      expect(service.isScreensaverActive()).toBe(true)

      service.exitScreensaverMode()

      expect(service.isScreensaverActive()).toBe(false)
      expect(service.getSessionToken()).toBeNull()
      expect(WindowManager.getInstance().exitScreensaverMode).toHaveBeenCalledTimes(1)
      expect(fakeSocket.write).toHaveBeenCalledWith(JSON.stringify({ action: 'wake' }) + '\n')
      expect(fakeSocket.end).toHaveBeenCalledTimes(1)
    })

    it('automatically wakes up if music playback stops during screensaver mode', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), destroyed: false }
      service.enterScreensaverMode(fakeSocket)
      expect(service.isScreensaverActive()).toBe(true)

      // Playback stops
      service.onPlaybackStateChanged(false, 'not_detected')

      expect(service.isScreensaverActive()).toBe(false)
      expect(WindowManager.getInstance().exitScreensaverMode).toHaveBeenCalled()
    })

    it('automatically wakes up if video playback starts during screensaver mode', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), destroyed: false }
      service.enterScreensaverMode(fakeSocket)
      expect(service.isScreensaverActive()).toBe(true)

      // Video starts
      service.onPlaybackStateChanged(true, 'detected')

      expect(service.isScreensaverActive()).toBe(false)
      expect(WindowManager.getInstance().exitScreensaverMode).toHaveBeenCalled()
    })

    it('automatically wakes up if media state becomes unknown or stale during screensaver mode', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), destroyed: false }
      service.enterScreensaverMode(fakeSocket)
      expect(service.isScreensaverActive()).toBe(true)

      // Media state becomes unknown
      service.onPlaybackStateChanged(true, 'unknown')

      expect(service.isScreensaverActive()).toBe(false)
      expect(WindowManager.getInstance().exitScreensaverMode).toHaveBeenCalled()
    })

    it('handles configure action by waking if active and focusing settings', () => {
      mockMainWindow.isMinimized.mockReturnValue(true)
      service.handleConfigure()

      expect(mockMainWindow.restore).toHaveBeenCalled()
      expect(mockMainWindow.show).toHaveBeenCalled()
      expect(mockMainWindow.focus).toHaveBeenCalled()
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('kissa:open-settings')
    })

    it('rejects duplicate activation requests when already active', () => {
      const primarySocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), setTimeout: vi.fn() }
      const secondarySocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), setTimeout: vi.fn() }

      ;(service as any).handleClientMessage(primarySocket, JSON.stringify({ action: 'activate' }))
      expect(service.isScreensaverActive()).toBe(true)
      expect(primarySocket.write).toHaveBeenCalledWith(expect.stringContaining('"status":"activated"'))
      expect(primarySocket.end).toHaveBeenCalledTimes(1)

      // Secondary activate request while active
      ;(service as any).handleClientMessage(secondarySocket, JSON.stringify({ action: 'activate' }))
      expect(secondarySocket.write).toHaveBeenCalledWith(expect.stringContaining('"status":"already_active"'))
      expect(secondarySocket.end).toHaveBeenCalledTimes(1)
    })

    it('handles repeated wake events idempotently without throwing', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn(), destroyed: false }
      service.enterScreensaverMode(fakeSocket)

      expect(service.isScreensaverActive()).toBe(true)
      service.notifyWake()
      expect(service.isScreensaverActive()).toBe(false)

      // Second wake call should be completely safe and no-op
      expect(() => service.notifyWake()).not.toThrow()
    })

    it('maintains screensaver session when activating client socket completes handshake and closes', () => {
      let closeHandler: (() => void) | null = null
      const fakeSocket: any = {
        write: vi.fn(),
        end: vi.fn(),
        setTimeout: vi.fn(),
        on: vi.fn((event, handler) => {
          if (event === 'close') closeHandler = handler
        })
      }

      ;(service as any).handleClientSocket(fakeSocket)
      ;(service as any).handleClientMessage(fakeSocket, JSON.stringify({ action: 'activate' }))
      expect(service.isScreensaverActive()).toBe(true)

      // When supervisor process completes activation and closes socket, session remains active
      expect(closeHandler).toBeTruthy()
      closeHandler!()

      expect(service.isScreensaverActive()).toBe(true)
    })

    it('handles invalid JSON safely and closes socket with error message', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn() }
      ;(service as any).handleClientMessage(fakeSocket, '{ invalid json')

      expect(fakeSocket.write).toHaveBeenCalledWith(expect.stringContaining('"invalid_json"'))
      expect(fakeSocket.end).toHaveBeenCalledTimes(1)
    })

    it('handles unknown actions safely and closes socket', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn() }
      ;(service as any).handleClientMessage(fakeSocket, JSON.stringify({ action: 'unknown_cmd' }))

      expect(fakeSocket.write).toHaveBeenCalledWith(expect.stringContaining('"unknown_action"'))
      expect(fakeSocket.end).toHaveBeenCalledTimes(1)
    })

    it('handles ping action and returns pong status', () => {
      const fakeSocket: any = { write: vi.fn(), end: vi.fn(), on: vi.fn() }
      ;(service as any).handleClientMessage(fakeSocket, JSON.stringify({ action: 'ping' }))

      expect(fakeSocket.write).toHaveBeenCalledWith(expect.stringContaining('"pong"'))
      expect(fakeSocket.end).toHaveBeenCalledTimes(1)
    })

    it('cleans up active sockets and closes server on stop()', () => {
      const fakeSocket: any = { destroy: vi.fn(), write: vi.fn(), end: vi.fn(), on: vi.fn() }
      const fakeServer: any = { close: vi.fn(), on: vi.fn(), listen: vi.fn() }

      service.enterScreensaverMode(fakeSocket)
      ;(service as any).server = fakeServer

      service.stop()

      expect(service.isScreensaverActive()).toBe(false)
      expect(fakeSocket.end).toHaveBeenCalled()
      expect(fakeServer.close).toHaveBeenCalled()
    })
  })
})
