import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'

const playbackHooks = vi.hoisted(() => ({ audio: vi.fn(), systemMedia: vi.fn() }))
vi.mock('@renderer/hooks/useAudioPlayback', () => ({ useAudioPlayback: playbackHooks.audio }))
vi.mock('@renderer/hooks/useSystemMediaSync', () => ({ useSystemMediaSync: playbackHooks.systemMedia }))

import App from '@renderer/App'
import { usePlayerStore } from '@renderer/stores/playerStore'

// Renders the whole app; under a full parallel run it can exceed the 5 s default.
describe('page changes overlap and settle', { timeout: 20_000 }, () => {
  beforeEach(() => {
    window.electron = {
      isScreensaver: vi.fn().mockResolvedValue(false),
      syncSettings: vi.fn().mockResolvedValue(undefined),
      setStartup: vi.fn().mockResolvedValue(undefined)
    } as any
    usePlayerStore.setState({
      isFullscreen: false,
      isMiniPlayer: false,
      isPartyMode: false,
      activeView: 'deck',
      currentTrack: { title: 'Self Control', artist: 'Frank Ocean', album: 'Blonde', duration: 249 }
    })
  })
  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('switching pages quickly ends with exactly one page mounted', async () => {
    const { container } = render(<App />)
    act(() => usePlayerStore.setState({ activeView: 'shelf' }))
    act(() => usePlayerStore.setState({ activeView: 'lyrics' }))
    act(() => usePlayerStore.setState({ activeView: 'deck' }))
    act(() => usePlayerStore.setState({ activeView: 'shelf' }))
    await waitFor(() => expect(container.querySelectorAll('[data-page]')).toHaveLength(1), { timeout: 5000 })
    expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('shelf')
  })
})
