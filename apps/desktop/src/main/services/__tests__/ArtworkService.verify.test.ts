import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ nativeImage: {} }))

import { ArtworkService } from '../ArtworkService'
import { coverDistance, SAME_COVER_MAX_DISTANCE } from '../coverMatch'

const ITUNES_COVER = 'https://is1-ssl.mzstatic.com/image/thumb/standard/100x100bb.jpg'
const PLAYER_COVER = 'data:image/jpeg;base64,' + 'A'.repeat(400)
const OTHER_PLAYER_COVER = 'data:image/jpeg;base64,' + 'B'.repeat(500)

function itunesAlbum(): Response {
  return new Response(
    JSON.stringify({ results: [{ collectionName: 'HEROES & VILLAINS', artistName: 'Metro Boomin', artworkUrl100: ITUNES_COVER }] }),
    { status: 200 }
  )
}

describe('ArtworkService.fetchArtworkFor', () => {
  let service: ArtworkService
  beforeEach(() => {
    // A fresh instance per test; the singleton keeps caches between tracks.
    service = new (ArtworkService as unknown as { new (): ArtworkService })()
    vi.stubGlobal('fetch', vi.fn(async () => itunesAlbum()))
  })
  afterEach(() => vi.unstubAllGlobals())

  const hiRes = ITUNES_COVER.replace('100x100bb', '1200x1200bb')

  it("keeps the player's cover when the catalogue has a different picture for the same album", async () => {
    service.compareCovers = vi.fn(async () => false)
    expect(await service.fetchArtworkFor('Superhero (Heroes & Villains)', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
    expect(service.getVerifiedArtwork('Superhero (Heroes & Villains)', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeUndefined()
    // The verdict is remembered: no second comparison for the same picture.
    expect(await service.fetchArtworkFor('Superhero (Heroes & Villains)', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
    expect(service.compareCovers).toHaveBeenCalledTimes(1)
  })

  it('uses the sharper copy once it is confirmed to be the same picture', async () => {
    service.compareCovers = vi.fn(async () => true)
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBe(hiRes)
    expect(service.getVerifiedArtwork('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBe(hiRes)
  })

  it('judges each picture separately (a stale cover from the last track does not stick)', async () => {
    service.compareCovers = vi.fn(async (reference: string) => reference === OTHER_PLAYER_COVER)
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', OTHER_PLAYER_COVER)).toBe(hiRes)
  })

  it('tries other catalogue entries until one has the same picture', async () => {
    const other = 'https://is1-ssl.mzstatic.com/image/thumb/edition/100x100bb.jpg'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('entity=song')
          ? new Response(JSON.stringify({ results: [{ trackName: 'Superhero', collectionName: 'HEROES & VILLAINS (Villains Version)', artistName: 'Metro Boomin', artworkUrl100: other }] }))
          : itunesAlbum()
      )
    )
    service.compareCovers = vi.fn(async (_ref: string, candidate: string) => candidate.includes('edition'))
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBe(other.replace('100x100bb', '1200x1200bb'))
  })

  it('offers the same-named album cover for Discord when no picture matched (motion art, other edition)', async () => {
    service.compareCovers = vi.fn(async () => false)
    expect(await service.fetchArtworkFor('Young Metro', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
    // The app keeps the player's picture; Discord gets the album's official cover, not Kissa's badge.
    expect(service.getVerifiedArtwork('Young Metro', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeUndefined()
    expect(service.getPublicArtwork('Young Metro', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBe(hiRes)
  })

  it('keeps the player cover when the comparison cannot run', async () => {
    service.compareCovers = vi.fn(async () => null)
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
  })
})

describe('ArtworkService long-session behaviour', () => {
  let service: ArtworkService
  let clock = 0
  beforeEach(() => {
    service = new (ArtworkService as unknown as { new (): ArtworkService })()
    clock = 1_000_000
    service.now = () => clock
  })
  afterEach(() => vi.unstubAllGlobals())

  it('does not repeat a lookup that found nothing on every update', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ results: [], data: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    // The app asks about once a second while a track with no catalogue match plays.
    for (let i = 0; i < 30; i++) {
      expect(await service.fetchArtworkFor('Obscure Demo', 'Nobody', 'Basement Tapes')).toBeNull()
      clock += 1_000
    }
    const firstRound = fetch.mock.calls.length
    expect(firstRound).toBeGreaterThan(0)
    expect(firstRound).toBeLessThanOrEqual(7)
    // Much later it is worth one more try.
    clock += 31 * 60_000
    await service.fetchArtworkFor('Obscure Demo', 'Nobody', 'Basement Tapes')
    expect(fetch.mock.calls.length).toBe(firstRound * 2)
  })

  it('retries soon after a network failure, not every second', async () => {
    let online = false
    const fetch = vi.fn(async () => {
      if (!online) throw new TypeError('fetch failed')
      return itunesAlbum()
    })
    vi.stubGlobal('fetch', fetch)
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS')).toBeNull()
    const offlineCalls = fetch.mock.calls.length
    clock += 10_000
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS')).toBeNull()
    expect(fetch.mock.calls.length).toBe(offlineCalls)
    online = true
    clock += 25_000
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS')).toContain('1200x1200bb')
  })

  it('stays bounded over many distinct tracks', () => {
    for (let i = 0; i < 1_000; i++) {
      service.setCachedArtwork(`Track ${i} (Remastered)`, `Artist ${i}`, `data:image/jpeg;base64,${i}`, `Album ${i}`)
    }
    expect(service.cachedEntryCount).toBeLessThanOrEqual(200)
    expect(service.getCachedArtwork('Track 999 (Remastered)', 'Artist 999', 'Album 999')).toBe('data:image/jpeg;base64,999')
  })
})

describe('coverDistance', () => {
  const px = (r: number, g: number, b: number, n = 4): Uint8Array => {
    const out = new Uint8Array(n * 4)
    for (let i = 0; i < n; i++) out.set([b, g, r, 255], i * 4)
    return out
  }
  it('is zero for identical pictures and large for different ones', () => {
    expect(coverDistance(px(10, 20, 30), px(10, 20, 30))).toBe(0)
    expect(coverDistance(px(10, 20, 30), px(12, 21, 29))).toBeLessThan(SAME_COVER_MAX_DISTANCE)
    expect(coverDistance(px(0, 0, 0), px(160, 40, 200))).toBeGreaterThan(SAME_COVER_MAX_DISTANCE)
  })
})
