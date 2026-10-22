import { describe, expect, it } from 'vitest'
import { judgeCover, SUSPECT_WINDOW_MS } from '../coverOwnership'

const IN_RAINBOWS = 'data:image/jpeg;base64,IN_RAINBOWS'
const GRADUATION = 'data:image/jpeg;base64,GRADUATION'

const nude = { cover: IN_RAINBOWS, title: 'Nude', artist: 'Radiohead', album: 'In Rainbows' }
const champion = { cover: GRADUATION, title: 'Champion', artist: 'Kanye West', album: 'Graduation' }
const LATER = SUSPECT_WINDOW_MS + 1

describe('judgeCover', () => {
  it("hides the previous album's picture at the start of the next album's track (screenshot 354)", () => {
    expect(
      judgeCover(nude, { cover: IN_RAINBOWS, title: 'Everything I Am (feat. DJ Premier)', artist: 'Kanye West', album: 'Graduation' }, 300)
    ).toBe('stale')
  })

  it('hides it for the same artist on a different album (screenshot 355)', () => {
    const everythingIAm = { cover: GRADUATION, title: 'Everything I Am (feat. DJ Premier)', artist: 'Kanye West', album: 'Graduation' }
    expect(
      judgeCover(
        everythingIAm,
        { cover: GRADUATION, title: 'Devil In a New Dress (feat. Rick Ross)', artist: 'Kanye West', album: 'My Beautiful Dark Twisted Fantasy' },
        1_000
      )
    ).toBe('stale')
  })

  it('shows, but never remembers, an identical picture on another release after the window (editions, offline)', () => {
    const deluxe = { cover: GRADUATION, title: 'Good Night', artist: 'Kanye West', album: 'Graduation (Deluxe)' }
    expect(judgeCover(champion, deluxe, 500)).toBe('stale')
    expect(judgeCover(champion, deluxe, LATER)).toBe('unproven')
  })

  it('treats the same song on another release like the helper does', () => {
    const single = { cover: GRADUATION, title: 'Champion', artist: 'Kanye West', album: 'Champion (Single)' }
    expect(judgeCover(champion, single, 500)).toBe('stale')
    expect(judgeCover(champion, single, LATER)).toBe('unproven')
  })

  it('accepts a new picture, and the shared picture of the same album, at once', () => {
    expect(judgeCover(nude, { cover: GRADUATION, title: 'Good Morning', artist: 'Kanye West', album: 'Graduation' }, 0)).toBe('own')
    expect(judgeCover(nude, { cover: IN_RAINBOWS, title: 'Reckoner', artist: 'Radiohead', album: 'in rainbows' }, 0)).toBe('own')
  })

  it('accepts the same track again (pause, replay, A/B/A)', () => {
    expect(judgeCover(nude, { ...nude }, 0)).toBe('own')
    expect(judgeCover(nude, { ...nude, album: '' }, 0)).toBe('own')
  })

  it('holds back, then shows without vouching, an identical picture when album names are missing', () => {
    expect(judgeCover(nude, { cover: IN_RAINBOWS, title: 'Track 2', artist: 'Radiohead', album: '' }, 500)).toBe('stale')
    expect(judgeCover(nude, { cover: IN_RAINBOWS, title: 'Track 2', artist: 'Radiohead', album: '' }, LATER)).toBe('unproven')
  })

  it('accepts anything as the first cover of a session', () => {
    expect(judgeCover(undefined, nude, 0)).toBe('own')
  })
})
