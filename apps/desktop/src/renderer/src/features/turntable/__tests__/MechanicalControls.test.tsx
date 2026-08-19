import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MechanicalControls } from '../MechanicalControls'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('MechanicalControls', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      isPowered: true,
      rpm: '33',
      currentTrack: {
        title: 'Self Control',
        artist: 'Frank Ocean',
        album: 'Blonde',
        duration: 249,
        source: 'Spotify',
        sourceAppId: 'spotify.exe'
      }
    })

    // Mock electron media play pause
    window.electron = {
      ...window.electron,
      mediaPlayPause: vi.fn().mockResolvedValue(undefined),
      mediaNext: vi.fn(),
      mediaPrev: vi.fn()
    } as any
  })

  it('renders all 3 controls: Power, Speed (33/45), and Start/Stop', () => {
    render(<MechanicalControls />)
    expect(screen.getByRole('button', { name: /Power Toggle/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /33 RPM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /45 RPM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Motor|Stop Motor/i })).toBeInTheDocument()
  })

  it('toggles power state and triggers single state change', () => {
    render(<MechanicalControls />)
    const powerBtn = screen.getByRole('button', { name: /Power Toggle/i })
    expect(usePlayerStore.getState().isPowered).toBe(true)

    fireEvent.pointerDown(powerBtn, { button: 0 })
    expect(usePlayerStore.getState().isPowered).toBe(false)

    fireEvent.pointerDown(powerBtn, { button: 0 })
    expect(usePlayerStore.getState().isPowered).toBe(true)
  })

  it('toggles RPM mutually exclusively between 33 and 45', () => {
    render(<MechanicalControls />)
    const btn33 = screen.getByRole('button', { name: /33 RPM/i })
    const btn45 = screen.getByRole('button', { name: /45 RPM/i })

    expect(usePlayerStore.getState().rpm).toBe('33')

    // Clicking 45 changes to 45
    fireEvent.pointerDown(btn45, { button: 0 })
    expect(usePlayerStore.getState().rpm).toBe('45')

    // Clicking 45 again does NOT toggle back to 33 (must remain mutually exclusive)
    fireEvent.pointerDown(btn45, { button: 0 })
    expect(usePlayerStore.getState().rpm).toBe('45')

    // Clicking 33 changes to 33
    fireEvent.pointerDown(btn33, { button: 0 })
    expect(usePlayerStore.getState().rpm).toBe('33')
  })

  it('toggles playback via Start/Stop button and calls mediaPlayPause IPC', () => {
    render(<MechanicalControls />)
    const playPauseBtn = screen.getByRole('button', { name: /Start Motor|Stop Motor/i })
    expect(usePlayerStore.getState().isPlaying).toBe(false)

    fireEvent.pointerDown(playPauseBtn, { button: 0 })
    expect(usePlayerStore.getState().isPlaying).toBe(true)
    expect(window.electron.mediaPlayPause).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(playPauseBtn, { button: 0 })
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(window.electron.mediaPlayPause).toHaveBeenCalledTimes(2)
  })
})
