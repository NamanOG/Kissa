import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MediaDetectionService } from '../MediaDetectionService'
import { ScreensaverSessionService } from '../ScreensaverSessionService'

describe('MediaDetectionService tri-state video and music playback semantics', () => {
  let service: MediaDetectionService

  beforeEach(() => {
    service = MediaDetectionService.getInstance()
    service.stop()
    vi.clearAllMocks()
    vi.spyOn(ScreensaverSessionService.getInstance(), 'onPlaybackStateChanged').mockImplementation(() => {})
  })

  afterEach(() => {
    service.stop()
    vi.restoreAllMocks()
  })

  describe('getVideoPlaybackState and freshness', () => {
    it('defaults to unknown state when service is initialized or stopped', () => {
      expect(service.getVideoPlaybackState()).toBe('unknown')
      expect(service.hasActiveVideo()).toBe(true) // Fail-closed posture
    })

    it('returns not_detected when healthy update is received with not_detected', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'

      expect(service.getVideoPlaybackState()).toBe('not_detected')
      expect(service.hasActiveVideo()).toBe(false)
    })

    it('returns detected when update reports active video', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'detected'

      expect(service.getVideoPlaybackState()).toBe('detected')
      expect(service.hasActiveVideo()).toBe(true)
    })

    it('returns unknown when update reports explicit unknown video state', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'unknown'

      expect(service.getVideoPlaybackState()).toBe('unknown')
      expect(service.hasActiveVideo()).toBe(true) // Fail closed
    })

    it('fails closed to unknown when last update has expired (> 3000ms freshness window)', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).videoPlaybackState = 'not_detected'
      // 3.5 seconds in the past
      ;(service as any).lastUpdateTimestamp = Date.now() - 3500

      expect(service.getVideoPlaybackState()).toBe('unknown')
      expect(service.hasActiveVideo()).toBe(true)
    })

    it('fails closed to unknown when worker is not healthy (e.g. crashed or terminated)', () => {
      ;(service as any).isWorkerHealthy = false
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).lastUpdateTimestamp = Date.now()

      expect(service.getVideoPlaybackState()).toBe('unknown')
      expect(service.hasActiveVideo()).toBe(true)
    })
  })

  describe('isMusicPlaying semantics', () => {
    it('qualifies internal Kissa vinyl/turntable audio as active music', () => {
      service.setInternalAudioPlaying(true)
      expect(service.isMusicPlaying()).toBe(true)
    })

    it('rejects internal audio when paused or stopped', () => {
      service.setInternalAudioPlaying(false)
      expect(service.isMusicPlaying()).toBe(false)
    })

    it('qualifies fresh external music from dedicated music apps (Spotify/Apple Music)', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: 'Blue in Green',
        artist: 'Miles Davis',
        sourceAppId: 'Spotify.exe'
      }

      expect(service.isMusicPlaying()).toBe(true)
    })

    it('rejects external media when paused', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: false,
        title: 'Blue in Green',
        artist: 'Miles Davis',
        sourceAppId: 'Spotify.exe'
      }

      expect(service.isMusicPlaying()).toBe(false)
    })

    it('rejects external media with empty or whitespace title', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: '   ',
        artist: 'Unknown',
        sourceAppId: 'Spotify.exe'
      }

      expect(service.isMusicPlaying()).toBe(false)
    })

    it('rejects external media when helper state is stale (> 3000ms old)', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now() - 4000
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: 'Stale Track',
        artist: 'Artist',
        sourceAppId: 'Spotify.exe'
      }

      expect(service.isMusicPlaying()).toBe(false)
    })

    it('rejects external media when worker is unhealthy or stopped', () => {
      ;(service as any).isWorkerHealthy = false
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: 'Track',
        artist: 'Artist',
        sourceAppId: 'Spotify.exe'
      }

      expect(service.isMusicPlaying()).toBe(false)
    })

    it('rejects ambiguous browser media as music if video is detected or unknown', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: 'YouTube Video Title',
        artist: 'Channel',
        sourceAppId: 'chrome.exe'
      }

      expect(service.isMusicPlaying()).toBe(false)
    })

    it('qualifies browser media as music ONLY if confirmed not_detected as video', () => {
      ;(service as any).isWorkerHealthy = true
      ;(service as any).lastUpdateTimestamp = Date.now()
      ;(service as any).videoPlaybackState = 'not_detected'
      ;(service as any).latestPayload = {
        isPlaying: true,
        title: 'Spotify Web Player Track',
        artist: 'Artist',
        sourceAppId: 'msedge.exe'
      }

      expect(service.isMusicPlaying()).toBe(true)
    })
  })
})
