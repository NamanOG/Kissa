import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FullscreenControls } from '../FullscreenControls'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('FullscreenControls', () => {
  const mockSetFullscreen = vi.fn()
  const mockTogglePlayPause = vi.fn()
  const mockPlayPrev = vi.fn()
  const mockPlayNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    usePlayerStore.setState({
      isPlaying: false,
      setFullscreen: mockSetFullscreen,
      togglePlayPause: mockTogglePlayPause,
      playPrev: mockPlayPrev,
      playNext: mockPlayNext
    })
  })

  it('renders transport buttons and binds them to store actions', () => {
    render(<FullscreenControls isVisible={true} />)

    fireEvent.click(screen.getByRole('button', { name: /play|pause/i }))
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /skip back/i }))
    expect(mockPlayPrev).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /skip forward/i }))
    expect(mockPlayNext).toHaveBeenCalledTimes(1)
  })

  it('binds exit fullscreen to store API', () => {
    render(<FullscreenControls isVisible={true} />)
    fireEvent.click(screen.getByRole('button', { name: /exit fullscreen/i }))
    expect(mockSetFullscreen).toHaveBeenCalledWith(false)
  })

  it('renders RoomDimmer', () => {
    render(<FullscreenControls isVisible={true} />)
    expect(screen.getByTitle('Room Illumination')).toBeInTheDocument()
  })

  it('applies hidden styles when isVisible is false', () => {
    const { container } = render(<FullscreenControls isVisible={false} />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).toHaveClass('opacity-0')
    expect(wrapper).toHaveClass('pointer-events-none')
  })

  it('does not create any native audio elements', () => {
    const { container } = render(<FullscreenControls isVisible={true} />)
    const audioTags = container.querySelectorAll('audio')
    expect(audioTags.length).toBe(0)
  })

  it('renders the lyrics toggle when canShowLyrics is true', () => {
    const mockOnToggle = vi.fn()
    render(<FullscreenControls isVisible={true} canShowLyrics={true} showLyrics={false} onToggleLyrics={mockOnToggle} />)
    
    const btn = screen.getByRole('button', { name: 'Show Lyrics' })
    expect(btn).toBeInTheDocument()
    
    fireEvent.click(btn)
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('hides the lyrics toggle when canShowLyrics is false', () => {
    render(<FullscreenControls isVisible={true} canShowLyrics={false} />)
    expect(screen.queryByRole('button', { name: /Show Lyrics/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hide Lyrics/i })).not.toBeInTheDocument()
  })
})
