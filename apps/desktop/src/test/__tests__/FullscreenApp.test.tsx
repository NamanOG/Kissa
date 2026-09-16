import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const playbackHooks = vi.hoisted(() => ({
  audio: vi.fn(),
  systemMedia: vi.fn()
}))

vi.mock('@renderer/hooks/useAudioPlayback', () => ({
  useAudioPlayback: playbackHooks.audio
}))

vi.mock('@renderer/hooks/useSystemMediaSync', () => ({
  useSystemMediaSync: playbackHooks.systemMedia
}))

import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('fullscreen App architecture', () => {
  beforeEach(() => {
    window.electron = {
      isScreensaver: vi.fn().mockResolvedValue(false),
      syncSettings: vi.fn().mockResolvedValue(undefined),
      setStartup: vi.fn().mockResolvedValue(undefined)
    } as any
    playbackHooks.audio.mockReset()
    playbackHooks.systemMedia.mockReset()
    usePlayerStore.setState({
      isFullscreen: true,
      isMiniPlayer: false,
      currentTrack: {
        title: 'Self Control',
        artist: 'Frank Ocean',
        album: 'Blonde',
        duration: 249
      }
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('unmounts the normal interface while retaining playback hooks above the fullscreen boundary', async () => {
    render(<App />)

    expect(await screen.findByRole('main', { name: 'Listening Room' })).toBeInTheDocument()
    expect(screen.queryByTitle('Drag tonearm to drop needle & seek')).not.toBeInTheDocument()
    expect(playbackHooks.audio.mock.calls.length).toBeGreaterThan(0)
    expect(playbackHooks.systemMedia.mock.calls.length).toBeGreaterThan(0)
  })
})
