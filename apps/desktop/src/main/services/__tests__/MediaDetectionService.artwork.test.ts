import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  shell: {},
  nativeImage: {},
  app: { getPath: () => '', getVersion: () => '4.3.1', isPackaged: false, getAppPath: () => '' }
}))

import { MediaDetectionService, resetHelperCoverState } from '../MediaDetectionService'
import { ArtworkService } from '../ArtworkService'
import { ScreensaverSessionService } from '../ScreensaverSessionService'

// Small stand-ins for the base64 the helper sends (longer than the 20-character floor).
const IN_RAINBOWS = '/9j/IN_RAINBOWS_COVER_BYTES_0000'
const GRADUATION = '/9j/GRADUATION_COVER_BYTES_00000'

function update(title: string, artist: string, album: string, thumb: string | null, extra: Record<string, unknown> = {}) {
  return {
    sourceAppId: 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App',
    media: { title, artist, albumTitle: album, albumArtist: artist, thumbnailBase64: thumb, thumbnailUnchanged: false, ...extra },
    playback: { playbackStatus: 4, playbackType: 1, canSeek: true },
    timeline: { position: 10, duration: 200 }
  }
}

describe('MediaDetectionService cover ownership through the update pipeline', () => {
  let service: MediaDetectionService
  const feed = (session: unknown): void => (service as any).processSessionUpdate(session, { master: 50, isMuted: false }, Date.now())

  beforeEach(() => {
    service = MediaDetectionService.getInstance()
    ;(service as any).latestPayload = null
    ;(service as any).lastPayloadJson = ''
    resetHelperCoverState()
    vi.spyOn(ScreensaverSessionService.getInstance(), 'onPlaybackStateChanged').mockImplementation(() => {})
    // No catalogue: web lookups find nothing, so only the player's picture is in play.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ results: [], data: [] }))))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("does not show or remember the last album's picture for the next album's track", () => {
    feed(update('Nude', 'Radiohead', 'In Rainbows', IN_RAINBOWS))
    expect((service as any).latestPayload.artworkDataUrl).toContain('IN_RAINBOWS')

    // Apple Music reports the new song while still serving the old picture ("unchanged").
    feed(update('Everything I Am (feat. DJ Premier)', 'Kanye West', 'Graduation', null, { thumbnailUnchanged: true }))
    expect((service as any).latestPayload.title).toBe('Everything I Am (feat. DJ Premier)')
    expect((service as any).latestPayload.artworkDataUrl).toBeUndefined()
    expect(ArtworkService.getInstance().getCachedArtwork('Everything I Am (feat. DJ Premier)', 'Kanye West', 'Graduation')).toBeUndefined()

    // The real cover arrives later and is taken at once.
    feed(update('Everything I Am (feat. DJ Premier)', 'Kanye West', 'Graduation', GRADUATION))
    expect((service as any).latestPayload.artworkDataUrl).toContain('GRADUATION')
    expect(ArtworkService.getInstance().getCachedArtwork('Everything I Am (feat. DJ Premier)', 'Kanye West', 'Graduation')).toContain('GRADUATION')
  })

  it('offline, still shows an edition that genuinely shares the previous picture, without remembering it', () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-10-19T12:00:00Z'))
      feed(update('Champion', 'Kanye West', 'Graduation', GRADUATION))
      vi.setSystemTime(new Date('2026-10-19T12:03:00Z'))
      // Deluxe edition, identical image file: suspect at first (could be a late swap)...
      feed(update('Good Night', 'Kanye West', 'Graduation (Deluxe)', null, { thumbnailUnchanged: true }))
      expect((service as any).latestPayload.artworkDataUrl).toBeUndefined()
      // ...but once the player has kept it past the window, it is shown.
      vi.setSystemTime(new Date('2026-10-19T12:03:05Z'))
      feed(update('Good Night', 'Kanye West', 'Graduation (Deluxe)', null, { thumbnailUnchanged: true }))
      expect((service as any).latestPayload.artworkDataUrl).toContain('GRADUATION')
      expect(ArtworkService.getInstance().getCachedArtwork('Good Night', 'Kanye West', 'Graduation (Deluxe)')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps a shared picture across tracks of the same album', () => {
    feed(update('Good Morning', 'Kanye West', 'Graduation', GRADUATION))
    feed(update('Champion', 'Kanye West', 'Graduation', null, { thumbnailUnchanged: true }))
    expect((service as any).latestPayload.artworkDataUrl).toContain('GRADUATION')
  })

  it('does not apply a late web result to another edition of the same song', async () => {
    let release: (url: string | null) => void = () => {}
    vi.spyOn(ArtworkService.getInstance(), 'fetchArtworkFor').mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve))
    )
    feed(update('Runaway', 'Kanye West', 'My Beautiful Dark Twisted Fantasy', null))
    // Same title and artist, different release, before the first lookup answers.
    feed(update('Runaway', 'Kanye West', 'Runaway (Single)', null))
    release('https://example.test/mbdtf-cover.jpg')
    await new Promise((r) => setTimeout(r, 0))
    expect((service as any).latestPayload.album).toBe('Runaway (Single)')
    expect((service as any).latestPayload.artworkDataUrl).not.toBe('https://example.test/mbdtf-cover.jpg')
  })
})
