import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { MiniPlayerView } from '../MiniPlayerView'

vi.mock('@renderer/features/vinyl', () => ({ VinylEngine: () => null }))
vi.mock('@renderer/features/study/StudyChip', () => ({ StudyChip: () => null }))

const media = { mediaPlayPause: vi.fn(), mediaNext: vi.fn(), mediaPrev: vi.fn() }

beforeEach(() => {
  Object.values(media).forEach((f) => f.mockClear())
  ;(window as unknown as { electron: unknown }).electron = media
})
afterEach(() => {
  delete (window as unknown as { electron?: unknown }).electron
})

describe('mini player transport', () => {
  it('drives the source player for a track from another app', () => {
    usePlayerStore.setState({
      isMiniPlayer: true,
      isPlaying: true,
      queue: [],
      currentTrack: { title: 'Song', artist: 'Artist', album: 'Album', duration: 200, sourceAppId: 'AppleMusic!App' }
    })
    render(<MiniPlayerView />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }))
    expect(media.mediaPlayPause).toHaveBeenCalledTimes(1)
    expect(media.mediaNext).toHaveBeenCalledTimes(1)
    expect(media.mediaPrev).toHaveBeenCalledTimes(1)
    // Next must not empty Kissa's own state while the source player handles the skip.
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Song')
  })

  it('every control has a name', () => {
    usePlayerStore.setState({ isMiniPlayer: true, currentTrack: null })
    render(<MiniPlayerView />)
    const unnamed = screen.getAllByRole('button').filter((b) => !b.getAttribute('aria-label'))
    expect(unnamed).toHaveLength(0)
  })
})
