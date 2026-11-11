import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ListeningRoom } from '../ListeningRoom'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('ListeningRoom', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: {
        title: 'A Very Long Track Title That Is Deliberately Written To Verify The Fullscreen Layout Remains Bounded',
        artist: 'Frank Ocean',
        album: 'Blonde',
        artworkUrl: 'https://example.com/blonde.jpg',
        duration: 249
      },
      illuminationLevel: 25
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the current track artwork and metadata', () => {
    render(<ListeningRoom />)

    expect(screen.getByRole('main', { name: 'Listening Room' })).toBeInTheDocument()
    expect(screen.getByText('Frank Ocean')).toBeInTheDocument()
    expect(screen.getByText('Blonde')).toBeInTheDocument()
  })

  it('keeps long titles within a bounded, clamped metadata layout', () => {
    render(<ListeningRoom />)

    // Bounded to the window and to a readable measure, and clamped to two lines.
    expect(screen.getByRole('heading')).toHaveClass('max-w-[min(100%,26em)]', 'line-clamp-2')
  })

  it('renders safely without a current track', () => {
    usePlayerStore.setState({ currentTrack: null })

    render(<ListeningRoom />)

    expect(screen.getByText('Waiting for music')).toBeInTheDocument()
  })

  it('renders when reduced motion is preferred', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    )

    render(<ListeningRoom />)

    expect(screen.getByRole('main', { name: 'Listening Room' })).toBeInTheDocument()
  })

  it('initially hides the cursor and controls', () => {
    render(<ListeningRoom />)
    const main = screen.getByRole('main', { name: 'Listening Room' })
    expect(main).toHaveClass('cursor-none')
  })

  it('reveals controls and cursor on a real pointer move, not on a key press', () => {
    render(<ListeningRoom />)
    const main = screen.getByRole('main', { name: 'Listening Room' })

    fireEvent.keyDown(window, { key: ' ' })
    expect(main).toHaveClass('cursor-none')

    fireEvent.pointerMove(main, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(main, { clientX: 160, clientY: 130 })
    expect(main).not.toHaveClass('cursor-none')
  })
})
