import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../playerStore'

describe('party mode', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPartyMode: false,
      isFullscreen: false,
      isListeningDisplay: false,
      activeView: 'shelf'
    })
  })

  it('opens the home screen full screen', () => {
    usePlayerStore.getState().setPartyMode(true)
    const s = usePlayerStore.getState()
    expect(s.isPartyMode).toBe(true)
    expect(s.isFullscreen).toBe(true)
    expect(s.activeView).toBe('deck')
  })

  it('ends when full screen ends by any route (Esc, F11, the exit button)', () => {
    usePlayerStore.getState().setPartyMode(true)
    usePlayerStore.getState().toggleFullscreen()
    expect(usePlayerStore.getState().isPartyMode).toBe(false)
    expect(usePlayerStore.getState().isFullscreen).toBe(false)
  })

  it('toggles off with P again', () => {
    usePlayerStore.getState().togglePartyMode()
    usePlayerStore.getState().togglePartyMode()
    expect(usePlayerStore.getState().isPartyMode).toBe(false)
    expect(usePlayerStore.getState().isFullscreen).toBe(false)
  })
})
