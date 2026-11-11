import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import { usePlayerStore } from '@renderer/stores/playerStore'

const ShortcutHarness = (): null => {
  useKeyboardShortcuts()
  return null
}

/**
 * One Space press must make exactly one play/pause. On a focused button the button answers Space
 * itself; the global shortcut toggling too sent two play/pauses for one press (live log, 11-10).
 */
describe('Space on a focused control', () => {
  beforeEach(() => {
    window.electron = { mediaPlayPause: vi.fn().mockResolvedValue(undefined) } as any
    usePlayerStore.setState({ isSettingsOpen: false, isKeyboardHelpOpen: false, isOnboardingOpen: false, isPlaying: false })
  })
  afterEach(() => {
    delete (window as Partial<Window>).electron
    document.body.innerHTML = ''
  })

  it('leaves a focused button to answer Space on its own', () => {
    render(<ShortcutHarness />)
    const button = document.createElement('button')
    const onPress = vi.fn(() => void window.electron.mediaPlayPause())
    button.addEventListener('click', onPress)
    document.body.appendChild(button)
    button.focus()

    // jsdom events are never trusted; the focused-control check comes first, so the result holds
    // for a real (trusted) press too.
    const keydown = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    button.dispatchEvent(keydown)
    // The button's own activation on key-up.
    button.click()

    expect(window.electron.mediaPlayPause).toHaveBeenCalledTimes(1)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })
})
