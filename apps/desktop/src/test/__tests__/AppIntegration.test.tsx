import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('App Integration', () => {
  let fullscreenChangedCallback: ((isFullscreen: boolean) => void) | undefined
  let unsubscribeFullscreenChanged: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fullscreenChangedCallback = undefined
    unsubscribeFullscreenChanged = vi.fn()
    window.electron = {
      syncSettings: vi.fn().mockResolvedValue(undefined),
      setStartup: vi.fn().mockResolvedValue(undefined),
      setThumbarButtons: vi.fn().mockResolvedValue(undefined),
      onFullscreenChanged: vi.fn((callback) => {
        fullscreenChangedCallback = callback
        return unsubscribeFullscreenChanged
      }),
      setFullScreen: vi.fn().mockResolvedValue(false),
      isScreensaver: vi.fn().mockResolvedValue(false),
      exitScreensaver: vi.fn().mockResolvedValue(undefined)
    } as any
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Starboy',
        artist: 'The Weeknd',
        album: 'Starboy',
        duration: 230
      },
      progress: 10,
      isFullscreen: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('renders the complete application shell with layout and active features', async () => {
    render(<App />)

    // Check Metadata Panel elements
    const headings = await screen.findAllByRole('heading', { name: 'Starboy' })
    expect(headings.length).toBeGreaterThan(0)
    expect(screen.getAllByText('The Weeknd').length).toBeGreaterThan(0)

    // Time is now handled via DOM refs and moved from ControlDock
    // Check Turntable & Tonearm
    expect(screen.getByTitle('Drag tonearm to drop needle & seek')).toBeInTheDocument()
  }, 15000)

  it('synchronizes play/pause button with store state across components', async () => {
    render(<App />)
    const playButton = await screen.findByRole('button', { name: 'Play' })

    await act(async () => fireEvent.click(playButton))
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    expect(screen.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0)
  })

  it('synchronizes OS fullscreen events without sending fullscreen IPC back to main', async () => {
    const { unmount } = render(<App />)

    act(() => {
      fullscreenChangedCallback?.(true)
      fullscreenChangedCallback?.(true)
    })

    expect(usePlayerStore.getState().isFullscreen).toBe(true)
    expect(window.electron.setFullScreen).not.toHaveBeenCalled()

    unmount()
    expect(unsubscribeFullscreenChanged).toHaveBeenCalledTimes(1)
  })
})
