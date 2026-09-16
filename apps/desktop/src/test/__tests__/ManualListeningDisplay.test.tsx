import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion') as any
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>
  }
})

describe('Manual Listening Display Launch', () => {
  let exitScreensaverMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    exitScreensaverMock = vi.fn().mockResolvedValue(undefined)

    window.electron = {
      syncSettings: vi.fn().mockResolvedValue(undefined),
      setStartup: vi.fn().mockResolvedValue(undefined),
      setThumbarButtons: vi.fn().mockResolvedValue(undefined),
      onFullscreenChanged: vi.fn(() => vi.fn()),
      setFullScreen: vi.fn().mockResolvedValue(false),
      isScreensaver: vi.fn().mockResolvedValue(false),
      exitScreensaver: exitScreensaverMock
    } as any

    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'Manual Launch Track',
        artist: 'Daft Punk',
        album: 'Discovery',
        duration: 260
      },
      isFullscreen: false,
      isMiniPlayer: false,
      isListeningDisplay: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
    vi.restoreAllMocks()
  })

  it('renders ListeningDisplay when isListeningDisplay is activated', async () => {
    render(<App />)

    // Wait for App to mount and resolve isScreensaver
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Listening Display' })).toBeInTheDocument()
    })

    // Click the button in ControlDock
    const startBtn = screen.getByRole('button', { name: 'Start Listening Display' })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
      expect(screen.getByText('Manual Launch Track')).toBeInTheDocument()
    })
  }, 15000)

  it('returns to normal Kissa on wake and NEVER invokes exitScreensaver in manual mode', async () => {
    usePlayerStore.setState({ isListeningDisplay: true })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
    })

    // Wait for wake detection attach debounce (500ms)
    await new Promise((resolve) => setTimeout(resolve, 550))

    // Fire wake keypress
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    await waitFor(() => {
      expect(usePlayerStore.getState().isListeningDisplay).toBe(false)
      expect(screen.queryByRole('main', { name: 'Listening Display' })).not.toBeInTheDocument()
    })

    // CRITICAL: exitScreensaver must NOT have been called in manual interactive mode
    expect(exitScreensaverMock).not.toHaveBeenCalled()
  })

  it('toggles isListeningDisplay via D keyboard shortcut', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Listening Display' })).toBeInTheDocument()
    })

    expect(usePlayerStore.getState().isListeningDisplay).toBe(false)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))
    })

    await waitFor(() => {
      expect(usePlayerStore.getState().isListeningDisplay).toBe(true)
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
    })
  })

  it('renders AlbumSleeve and toggles synced lyrics via L key without exiting', async () => {
    usePlayerStore.setState({ isListeningDisplay: true, screensaverLyrics: false })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
    })

    // Album cover image should be present with alt text
    expect(screen.getByAltText('Manual Launch Track')).toBeInTheDocument()
    expect(screen.getByText(/\[ L \] Live Lyrics/)).toBeInTheDocument()

    // Press L to toggle lyrics mode
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })

    await waitFor(() => {
      expect(usePlayerStore.getState().screensaverLyrics).toBe(true)
      // Mode hint switches to Album Art
      expect(screen.getByText(/\[ L \] Album Art/)).toBeInTheDocument()
    })

    // Crucially, it did NOT exit Listening Display
    expect(usePlayerStore.getState().isListeningDisplay).toBe(true)
    expect(exitScreensaverMock).not.toHaveBeenCalled()
  })
})
