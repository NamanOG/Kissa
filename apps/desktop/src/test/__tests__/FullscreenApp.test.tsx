import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('unmounts the normal interface while retaining playback hooks above the fullscreen boundary', () => {
    render(<App />)

    expect(screen.getByRole('main', { name: 'Listening Room' })).toBeInTheDocument()
    expect(screen.queryByTitle('Drag tonearm to drop needle & seek')).not.toBeInTheDocument()
    expect(playbackHooks.audio).toHaveBeenCalledTimes(1)
    expect(playbackHooks.systemMedia).toHaveBeenCalledTimes(1)
  })
})
