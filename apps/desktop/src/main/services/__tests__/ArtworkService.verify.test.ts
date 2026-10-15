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

  it('keeps the player cover when the comparison cannot run', async () => {
    service.compareCovers = vi.fn(async () => null)
    expect(await service.fetchArtworkFor('Superhero', 'Metro Boomin', 'HEROES & VILLAINS', PLAYER_COVER)).toBeNull()
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
