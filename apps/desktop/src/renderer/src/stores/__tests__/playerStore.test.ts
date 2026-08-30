import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from '../playerStore'

describe('usePlayerStore', () => {
  beforeEach(() => {
    window.electron = {
      setFullScreen: vi.fn().mockResolvedValue(false),
      toggleMiniPlayer: vi.fn().mockResolvedValue(undefined)
    } as any
    localStorage.removeItem('kissa_fullscreen')
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Kissa',
        artist: 'Listening Machine',
        album: 'Kissa',
        duration: 0,
        source: 'Kissa System'
      },
      progress: 0,
      isFullscreen: false,
      isMiniPlayer: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('initializes with expected default or configured state', () => {
    const state = usePlayerStore.getState()
    expect(state.isPlaying).toBe(false)
    expect(state.currentTrack?.title).toBe('Kissa')
    expect(state.currentTrack?.artist).toBe('Listening Machine')
    expect(state.currentTrack?.audioUrl).toBeUndefined()
    expect(state.progress).toBe(0)
  })

  it('toggles play and pause correctly', () => {
    usePlayerStore.getState().play()
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    usePlayerStore.getState().pause()
    expect(usePlayerStore.getState().isPlaying).toBe(false)

    usePlayerStore.getState().togglePlayPause()
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    usePlayerStore.getState().togglePlayPause()
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('sets a new track and resets progress to 0', () => {
    usePlayerStore.getState().setProgress(150)
    expect(usePlayerStore.getState().progress).toBe(150)

    usePlayerStore.getState().setTrack({
      title: 'New Track',
      artist: 'New Artist',
      album: 'New Album',
      duration: 200
    })

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.title).toBe('New Track')
    expect(state.progress).toBe(0)
  })

  it('handles numeric progress updates with bounds clamping', () => {
    usePlayerStore.getState().setTrack({
      title: 'Test',
      artist: 'Test',
      album: 'Test',
      duration: 300
    })
    
    usePlayerStore.getState().setProgress(100)
    expect(usePlayerStore.getState().progress).toBe(100)

    // Clamps to duration maximum (300)
    usePlayerStore.getState().setProgress(500)
    expect(usePlayerStore.getState().progress).toBe(300)

    // Clamps to 0 minimum
    usePlayerStore.getState().setProgress(-50)
    expect(usePlayerStore.getState().progress).toBe(0)
  })

  it('handles function progress updates safely', () => {
    usePlayerStore.getState().setProgress(50)
    usePlayerStore.getState().setProgress((prev) => prev + 25)
    expect(usePlayerStore.getState().progress).toBe(75)
  })

  it('handles NaN gracefully by resetting progress to 0', () => {
    usePlayerStore.getState().setProgress(NaN)
    expect(usePlayerStore.getState().progress).toBe(0)
  })

  it('switches listening environment themes and persists correctly', () => {
    usePlayerStore.getState().setTheme('jazz-bar')
    expect(usePlayerStore.getState().theme).toBe('jazz-bar')

    usePlayerStore.getState().setTheme('sunday-morning')
    expect(usePlayerStore.getState().theme).toBe('sunday-morning')
  })

  it('initializes fullscreen state as false without persistence', () => {
    expect(usePlayerStore.getState().isFullscreen).toBe(false)
    expect(localStorage.getItem('kissa_fullscreen')).toBeNull()
  })

  it('sets fullscreen state and requests the matching Electron fullscreen state', () => {
    const setFullScreen = window.electron.setFullScreen as ReturnType<typeof vi.fn>
    setFullScreen.mockResolvedValue(true)

    usePlayerStore.getState().setFullscreen(true)

    expect(usePlayerStore.getState().isFullscreen).toBe(true)
    expect(setFullScreen).toHaveBeenCalledWith(true)
  })

  it('exits fullscreen and requests the matching Electron fullscreen state', () => {
    const setFullScreen = window.electron.setFullScreen as ReturnType<typeof vi.fn>
    usePlayerStore.setState({ isFullscreen: true })

    usePlayerStore.getState().setFullscreen(false)

    expect(usePlayerStore.getState().isFullscreen).toBe(false)
    expect(setFullScreen).toHaveBeenCalledWith(false)
  })

  it('toggles fullscreen state', () => {
    const setFullScreen = window.electron.setFullScreen as ReturnType<typeof vi.fn>
    setFullScreen.mockResolvedValue(true)

    usePlayerStore.getState().toggleFullscreen()

    expect(usePlayerStore.getState().isFullscreen).toBe(true)
    expect(setFullScreen).toHaveBeenCalledWith(true)
  })

  it('reconciles optimistic fullscreen state with the native window result', async () => {
    const setFullScreen = window.electron.setFullScreen as ReturnType<typeof vi.fn>
    setFullScreen.mockResolvedValue(false)

    usePlayerStore.getState().setFullscreen(true)
    await Promise.resolve()

    expect(usePlayerStore.getState().isFullscreen).toBe(false)
  })

  it('exits mini-player before entering fullscreen', () => {
    const setFullScreen = window.electron.setFullScreen as ReturnType<typeof vi.fn>
    const toggleMiniPlayer = window.electron.toggleMiniPlayer as ReturnType<typeof vi.fn>
    setFullScreen.mockResolvedValue(true)
    usePlayerStore.setState({ isMiniPlayer: true, miniPlayerAlwaysOnTop: true })

    usePlayerStore.getState().setFullscreen(true)

    expect(usePlayerStore.getState().isMiniPlayer).toBe(false)
    expect(toggleMiniPlayer).toHaveBeenCalledWith(false, true)
    expect(setFullScreen).toHaveBeenCalledWith(true)
    expect(toggleMiniPlayer.mock.invocationCallOrder[0]).toBeLessThan(
      setFullScreen.mock.invocationCallOrder[0]
    )
  })
})
