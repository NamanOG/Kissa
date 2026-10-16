import { beforeEach, describe, expect, it } from 'vitest'
import { useShelfStore } from '../shelfStore'

const track = {
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  duration: 200,
  sourceAppId: 'AppleMusic',
  artworkUrl: 'https://example.com/old.jpg'
}

describe('shelf cover repair', () => {
  beforeEach(() => {
    useShelfStore.getState().clearShelf()
  })

  it('replaces legacy catalogue art without adding a listen or changing dates', () => {
    useShelfStore.getState().addOrUpdateRecord(track)
    const old = useShelfStore.getState().records[0]
    useShelfStore.getState().repairArtwork({ ...track, artworkUrl: 'data:image/png;base64,new' })
    expect(useShelfStore.getState().records[0]).toEqual({
      ...old,
      artworkUrl: 'data:image/png;base64,new'
    })
  })

  it('does not replace a saved cover with the bundled placeholder or a different album', () => {
    useShelfStore.getState().addOrUpdateRecord(track)
    useShelfStore.getState().repairArtwork({ ...track, artworkUrl: '/assets/placeholder.png' })
    useShelfStore
      .getState()
      .repairArtwork({ ...track, album: 'Different', artworkUrl: 'data:image/png;base64,new' })
    expect(useShelfStore.getState().records[0].artworkUrl).toBe(track.artworkUrl)
  })
})
