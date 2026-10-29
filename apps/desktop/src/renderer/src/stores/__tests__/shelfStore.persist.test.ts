import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeferredStorage } from '../../utils/deferredStorage'
import { needsShrink, SHELF_COVER_SHRINK_ABOVE } from '../shelfCovers'
import { useShelfStore } from '../shelfStore'

describe('deferred persist storage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves once after changes settle, not on every change', () => {
    const storage = createDeferredStorage<{ n: number }>(1000)
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    storage.setItem('k', { state: { n: 1 }, version: 0 })
    storage.setItem('k', { state: { n: 2 }, version: 0 })
    expect(spy).not.toHaveBeenCalled()
    expect(storage.getItem('k')).toEqual({ state: { n: 2 }, version: 0 })
    vi.advanceTimersByTime(3000)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ state: { n: 2 }, version: 0 })
    spy.mockRestore()
  })

  it('writes straight away when the window closes', () => {
    const storage = createDeferredStorage<{ n: number }>(60_000)
    storage.setItem('closing', { state: { n: 7 }, version: 0 })
    window.dispatchEvent(new Event('beforeunload'))
    expect(JSON.parse(localStorage.getItem('closing')!)).toEqual({ state: { n: 7 }, version: 0 })
  })

  it('a song change on the shelf does not write storage synchronously', () => {
    useShelfStore.setState({ records: [] })
    vi.advanceTimersByTime(5000)
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    useShelfStore.getState().addOrUpdateRecord({
      title: 'So What',
      artist: 'Miles Davis',
      album: 'Kind of Blue',
      duration: 545,
      sourceAppId: 'Spotify.exe'
    })
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('shelf cover size', () => {
  it('only shrinks large embedded covers', () => {
    expect(needsShrink('https://example.com/a.jpg')).toBe(false)
    expect(needsShrink('data:image/png;base64,abc')).toBe(false)
    expect(needsShrink('data:image/png;base64,' + 'a'.repeat(SHELF_COVER_SHRINK_ABOVE))).toBe(true)
  })
})
