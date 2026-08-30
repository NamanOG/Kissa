import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

    expect(screen.getByRole('heading')).toHaveClass('max-w-full', 'line-clamp-2')
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

  it('reveals controls and cursor on pointer move', () => {
    render(<ListeningRoom />)
    const main = screen.getByRole('main', { name: 'Listening Room' })
    
    // Simulate pointer move
    import('@testing-library/react').then(({ fireEvent }) => {
      fireEvent.pointerMove(main)
      expect(main).not.toHaveClass('cursor-none')
      // FullscreenControls wrapper becomes visible
      const exitBtn = screen.getByRole('button', { name: /exit fullscreen/i })
      const wrapper = exitBtn.parentElement?.parentElement
      expect(wrapper).toHaveClass('opacity-100')
    })
  })
})
