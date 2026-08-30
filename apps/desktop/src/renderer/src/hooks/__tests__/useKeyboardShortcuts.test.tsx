import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import { usePlayerStore } from '@renderer/stores/playerStore'

const ShortcutHarness = (): null => {
  useKeyboardShortcuts()
  return null
}

describe('useKeyboardShortcuts fullscreen behavior', () => {
  beforeEach(() => {
    window.electron = {
      setFullScreen: vi.fn().mockResolvedValue(false),
      toggleMiniPlayer: vi.fn().mockResolvedValue(undefined)
    } as any
    usePlayerStore.setState({
      isFullscreen: false,
      isSettingsOpen: false,
      isKeyboardHelpOpen: false,
      isOnboardingOpen: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('toggles fullscreen with F11 and prevents the default browser behavior', () => {
    render(<ShortcutHarness />)
    const event = new KeyboardEvent('keydown', { key: 'F11', cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(usePlayerStore.getState().isFullscreen).toBe(true)
    expect(window.electron.setFullScreen).toHaveBeenCalledWith(true)
  })

  it('exits fullscreen with Escape', () => {
    render(<ShortcutHarness />)
    usePlayerStore.setState({ isFullscreen: true })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(usePlayerStore.getState().isFullscreen).toBe(false)
    expect(window.electron.setFullScreen).toHaveBeenCalledWith(false)
  })

  it('lets an open modal handle Escape before fullscreen exit', () => {
    render(<ShortcutHarness />)
    usePlayerStore.setState({ isFullscreen: true, isSettingsOpen: true })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(usePlayerStore.getState().isSettingsOpen).toBe(false)
    expect(usePlayerStore.getState().isFullscreen).toBe(true)
    expect(window.electron.setFullScreen).not.toHaveBeenCalled()
  })

  it('suppresses internal progress seek on Shift+ArrowRight for external media', () => {
    render(<ShortcutHarness />)
    usePlayerStore.setState({ 
      progress: 50,
      currentTrack: {
        title: 'Spotify Track',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 200,
        sourceAppId: 'spotify.exe'
      }
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, cancelable: true }))

    // Should still be 50, not 55
    expect(usePlayerStore.getState().progress).toBe(50)
  })

  it('allows internal progress seek on Shift+ArrowRight for internal media', () => {
    render(<ShortcutHarness />)
    usePlayerStore.setState({ 
      progress: 50,
      currentTrack: {
        title: 'Local Track',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 200,
        audioUrl: 'test.mp3'
      }
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, cancelable: true }))

    // Should be 55
    expect(usePlayerStore.getState().progress).toBe(55)
  })
})
