import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

// Mock the framer-motion AnimatePresence to render children directly without waiting
// for framer-motion's internal lifecycle, making tests more reliable.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion') as any
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>
  }
})

describe('Screensaver Route Integration', () => {
  let isScreensaverMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    isScreensaverMock = vi.fn().mockResolvedValue(true)
    
    window.electron = {
      syncSettings: vi.fn().mockResolvedValue(undefined),
      setStartup: vi.fn().mockResolvedValue(undefined),
      setThumbarButtons: vi.fn().mockResolvedValue(undefined),
      onFullscreenChanged: vi.fn(() => vi.fn()),
      setFullScreen: vi.fn().mockResolvedValue(false),
      isScreensaver: isScreensaverMock,
      exitScreensaver: vi.fn().mockResolvedValue(undefined)
    } as any

    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Screensaver Test',
        artist: 'The Weeknd',
        album: 'Starboy',
        duration: 230
      },
      isFullscreen: false,
      isMiniPlayer: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
    vi.restoreAllMocks()
  })

  it('renders ONLY ListeningDisplay when launched as screensaver', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
    })

    // The normal app layout should NOT be rendered.
    // Let's verify normal UI elements are completely absent.
    expect(screen.queryByRole('heading', { name: 'Kissa' })).not.toBeInTheDocument() // Usually in sidebar/header
    expect(screen.queryByTitle('Room Illumination')).not.toBeInTheDocument() // Part of normal room
    
    const headings = screen.getAllByRole('heading', { name: 'Screensaver Test' })
    expect(headings.length).toBeGreaterThan(0)
  }, 15000)

  it('renders normal app when not launched as screensaver', async () => {
    isScreensaverMock.mockResolvedValue(false)
    render(<App />)

    await waitFor(() => {
      expect(screen.queryByRole('main', { name: 'Listening Display' })).not.toBeInTheDocument()
    })

    expect(screen.getByTitle('Drag tonearm to drop needle & seek')).toBeInTheDocument()
  })

  it('toggles between album art and synced lyrics via L key in screensaver mode without exiting', async () => {
    usePlayerStore.setState({ screensaverLyrics: false })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('main', { name: 'Listening Display' })).toBeInTheDocument()
    })

    expect(screen.getByText(/\[ L \] Live Lyrics/)).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })

    await waitFor(() => {
      expect(usePlayerStore.getState().screensaverLyrics).toBe(true)
      expect(screen.getByText(/\[ L \] Album Art/)).toBeInTheDocument()
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    })

    await waitFor(() => {
      expect(usePlayerStore.getState().screensaverLyrics).toBe(false)
      expect(screen.getByText(/\[ L \] Live Lyrics/)).toBeInTheDocument()
    })

    expect(window.electron.exitScreensaver).not.toHaveBeenCalled()
  })
})
