import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { NowPlayingAnnouncer } from '../NowPlayingAnnouncer'

const track = (title: string, artist = 'Frank Ocean') => ({ title, artist, album: 'Blonde', duration: 200 })

beforeEach(() => {
  vi.useFakeTimers()
  usePlayerStore.setState({ currentTrack: track('Nikes') })
})
afterEach(() => vi.useRealTimers())

describe('song change announcement', () => {
  it('stays quiet at start-up, then announces each new song once after it settles', () => {
    render(<NowPlayingAnnouncer />)
    const region = screen.getByTestId('now-playing-announcer')
    expect(region).toHaveAttribute('aria-live', 'polite')
    act(() => vi.advanceTimersByTime(5000))
    expect(region.textContent).toBe('') // the song already showing at start-up
    act(() => usePlayerStore.setState({ currentTrack: track('Ivy') }))
    act(() => vi.advanceTimersByTime(600))
    act(() => usePlayerStore.setState({ currentTrack: track('Pink + White') })) // skipped past Ivy
    act(() => vi.advanceTimersByTime(1300))
    expect(region.textContent).toBe('Now playing: Pink + White by Frank Ocean')
    // The same song again (a pause and resume, a progress update): nothing new.
    act(() => usePlayerStore.setState({ currentTrack: { ...track('Pink + White') }, isPlaying: false }))
    act(() => vi.advanceTimersByTime(2000))
    expect(region.textContent).toBe('Now playing: Pink + White by Frank Ocean')
  })
})
