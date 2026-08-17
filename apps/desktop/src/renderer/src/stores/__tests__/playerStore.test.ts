import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from '../playerStore'

describe('usePlayerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 300
      },
      progress: 0
    })
  })

  it('initializes with expected default or configured state', () => {
    const state = usePlayerStore.getState()
    expect(state.isPlaying).toBe(false)
    expect(state.currentTrack?.title).toBe('Test Song')
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
})
