import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlDock } from '../ControlDock'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('ControlDock component', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Instant Crush',
        artist: 'Daft Punk',
        album: 'RAM',
        duration: 337
      },
      progress: 42
    })
  })

  it('renders transport controls and toggles playback state', () => {
    render(<ControlDock />)
    const playBtn = screen.getByRole('button', { name: 'Play' })
    expect(playBtn).toBeInTheDocument()

    fireEvent.click(playBtn)
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    const pauseBtn = screen.getByRole('button', { name: 'Pause' })
    expect(pauseBtn).toBeInTheDocument()

    fireEvent.click(pauseBtn)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  }, 15000)

  it('disables control dock actions when currentTrack is null', () => {
    usePlayerStore.setState({ currentTrack: null })
    const { container } = render(<ControlDock />)
    const dockEl = container.firstChild as HTMLElement
    expect(dockEl).toHaveClass('opacity-50', 'pointer-events-none')
  })
})
