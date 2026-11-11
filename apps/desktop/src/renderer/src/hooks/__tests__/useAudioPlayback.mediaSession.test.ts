import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@renderer/features/hifi/vinylEngine', () => ({
  vinylEngine: { attach: vi.fn(), detach: vi.fn() }
}))
vi.mock('@renderer/utils/needleSounds', () => ({ needleFollowPlayback: vi.fn() }))

import { useAudioPlayback } from '../useAudioPlayback'
import { usePlayerStore } from '@renderer/stores/playerStore'

/**
 * Kissa's own (Chromium) media session must not claim to be playing while another player has
 * the music: a second "playing" session beside Apple Music is how Windows media keys and the
 * media flyout can end up pointed at the wrong player.
 */
describe('Kissa media session', () => {
  const session = { playbackState: 'none' as MediaSessionPlaybackState, metadata: null, setActionHandler: vi.fn() }

  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true })
    session.playbackState = 'none'
  })
  afterEach(() => {
    usePlayerStore.setState({ isPlaying: false })
  })

  it('stays "none" while Apple Music plays', () => {
    usePlayerStore.setState({
      currentTrack: {
        title: 'Song',
        artist: 'Artist',
        album: 'Album',
        artworkUrl: '',
        duration: 200,
        source: 'Apple Music',
        sourceAppId: 'AppleInc.AppleMusicWin_x!App'
      },
      isPlaying: false
    })
    renderHook(() => useAudioPlayback())
    act(() => usePlayerStore.setState({ isPlaying: true }))
    expect(session.playbackState).toBe('none')
    act(() => usePlayerStore.setState({ isPlaying: false }))
    expect(session.playbackState).toBe('none')
  })
})
