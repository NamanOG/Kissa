import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FullscreenProgress } from '../FullscreenProgress'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('FullscreenProgress', () => {
  const unsubscribe = vi.fn()

  beforeEach(() => {
    unsubscribe.mockReset()
    usePlayerStore.setState({
      currentTrack: {
        title: 'Progress Test',
        artist: 'Kissa',
        album: 'Listening Room',
        duration: 200
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('subscribes to PlaybackClock and updates the rail imperatively', () => {
    const subscribe = vi.spyOn(PlaybackClock, 'subscribe').mockImplementation((callback) => {
      callback(50)
      return unsubscribe
    })

    render(<FullscreenProgress />)

    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('fullscreen-progress-fill')).toHaveStyle('transform: scaleX(0.25)')
  })

  it('cleans up its PlaybackClock subscription without creating an RAF loop', () => {
    const subscribe = vi.spyOn(PlaybackClock, 'subscribe').mockReturnValue(unsubscribe)
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame')
    const { unmount } = render(<FullscreenProgress />)

    unmount()

    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
