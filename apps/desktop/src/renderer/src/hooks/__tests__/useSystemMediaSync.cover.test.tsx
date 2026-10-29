import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { COVER_WAIT_MS, useSystemMediaSync } from '../useSystemMediaSync'
import { usePlayerStore } from '@renderer/stores/playerStore'
import type { SystemMediaPayload } from '../../../../types/media'

const Harness = (): null => {
  useSystemMediaSync()
  return null
}

const song = (title: string, art?: string): SystemMediaPayload => ({
  sourceAppId: 'AppleMusic',
  sourceAppName: 'Apple Music',
  title,
  artist: 'Artist',
  album: 'Album',
  isPlaying: true,
  progress: 1,
  duration: 200,
  artworkDataUrl: art
})

describe('a new song waits briefly for its cover', () => {
  let send: (payload: SystemMediaPayload | null) => void

  beforeEach(async () => {
    vi.useFakeTimers()
    window.electron = {
      getSystemMedia: vi.fn().mockResolvedValue(null),
      onSystemMediaUpdate: vi.fn((cb) => {
        send = cb
        return () => {}
      })
    } as any
    usePlayerStore.setState({ currentTrack: null, isPlaying: false, progress: 0 })
    render(<Harness />)
    // Let the start-up read (nothing playing) land first, as it does in the app.
    await Promise.resolve()
    await Promise.resolve()
    send(song('First', 'data:image/jpeg;base64,first'))
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as Partial<Window>).electron
  })

  const shown = () => usePlayerStore.getState().currentTrack

  it('keeps the current song on screen until the cover comes, then changes once', () => {
    send(song('Second'))
    expect(shown()?.title).toBe('First')
    vi.advanceTimersByTime(200)
    send(song('Second', 'data:image/jpeg;base64,second'))
    expect(shown()?.title).toBe('Second')
    expect(shown()?.artworkUrl).toBe('data:image/jpeg;base64,second')
  })

  it('shows the song without a cover if none comes in time', () => {
    send(song('Second'))
    vi.advanceTimersByTime(COVER_WAIT_MS + 10)
    expect(shown()?.title).toBe('Second')
    // A cover arriving later still lands.
    send(song('Second', 'data:image/jpeg;base64,late'))
    expect(shown()?.artworkUrl).toBe('data:image/jpeg;base64,late')
  })

  it('a song skipped while waiting is never shown', () => {
    send(song('Second'))
    send(song('Third', 'data:image/jpeg;base64,third'))
    expect(shown()?.title).toBe('Third')
    vi.advanceTimersByTime(COVER_WAIT_MS + 10)
    expect(shown()?.title).toBe('Third')
  })

  it('shows the first song at once when nothing was on screen', () => {
    usePlayerStore.setState({ currentTrack: null })
    send(song('Fresh'))
    expect(shown()?.title).toBe('Fresh')
  })
})
