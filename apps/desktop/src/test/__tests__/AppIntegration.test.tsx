import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('App Integration', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Starboy',
        artist: 'The Weeknd',
        album: 'Starboy',
        duration: 230
      },
      progress: 10
    })
  })

  it('renders the complete application shell with layout and active features', () => {
    render(<App />)

    // Check Metadata Panel elements
    const headings = screen.getAllByRole('heading', { name: 'Starboy' })
    expect(headings.length).toBeGreaterThan(0)
    expect(screen.getAllByText('The Weeknd').length).toBeGreaterThan(0)

    // Time is now handled via DOM refs and moved from ControlDock
    // Check Turntable & Tonearm
    expect(screen.getByTitle('Drag tonearm to drop needle & seek')).toBeInTheDocument()
  }, 15000)

  it('synchronizes play/pause button with store state across components', () => {
    render(<App />)
    const playButton = screen.getByRole('button', { name: 'Play' })

    fireEvent.click(playButton)
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    expect(screen.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0)
  })
})
