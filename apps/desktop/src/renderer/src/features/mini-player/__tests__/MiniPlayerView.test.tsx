import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
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

describe('mini player at rest', () => {
  it('shows only the record until the cursor is over the window', () => {
    vi.useFakeTimers()
    let hover: ((inside: boolean) => void) | undefined
    ;(window as unknown as { electron: unknown }).electron = {
      ...media,
      onMiniHover: (cb: (inside: boolean) => void) => {
        hover = cb
        return () => undefined
      }
    }
    usePlayerStore.setState({ isMiniPlayer: true, currentTrack: null })
    const { container } = render(<MiniPlayerView />)
    const root = container.firstElementChild as HTMLElement
    // The controls show on opening, then step aside.
    expect(root.dataset.chrome).toBe('shown')
    act(() => vi.advanceTimersByTime(3000))
    expect(root.dataset.chrome).toBe('hidden')
    act(() => hover?.(true))
    expect(root.dataset.chrome).toBe('shown')
    act(() => hover?.(false))
    act(() => vi.advanceTimersByTime(1000))
    expect(root.dataset.chrome).toBe('hidden')
    vi.useRealTimers()
  })
})

describe('mini player Moving light', () => {
  const track = { title: 'Song', artist: 'Artist', album: 'Album', duration: 200, artworkUrl: 'cover.jpg' }
  it('lets the light through with a static shade when Moving light is on', () => {
    usePlayerStore.setState({ isMiniPlayer: true, theme: 'adaptive', ambientMotion: true, currentTrack: track })
    const { container } = render(<MiniPlayerView />)
    const root = container.firstElementChild as HTMLElement
    expect(root.hasAttribute('data-moving-light')).toBe(true)
    expect(root.className).toContain('bg-transparent')
    expect(container.querySelector('[data-mini-scrim]')).not.toBeNull()
  })

  it('keeps the solid panel when Moving light is off or the room is not Match the album', () => {
    usePlayerStore.setState({ isMiniPlayer: true, theme: 'adaptive', ambientMotion: false, currentTrack: track })
    const { container, unmount } = render(<MiniPlayerView />)
    expect(container.querySelector('[data-mini-scrim]')).toBeNull()
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-[var(--panel-bg)]')
    unmount()
    usePlayerStore.setState({ theme: 'jazz-bar', ambientMotion: true })
    const second = render(<MiniPlayerView />)
    expect(second.container.querySelector('[data-mini-scrim]')).toBeNull()
  })
})
