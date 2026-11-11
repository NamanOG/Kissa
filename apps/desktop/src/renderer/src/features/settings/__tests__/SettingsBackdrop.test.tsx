import { describe, expect, it, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SettingsModal } from '../SettingsModal'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('Settings backdrop', () => {
  beforeEach(() => {
    window.electron = {
      getAppVersion: () => Promise.resolve('5.1.0'),
      isScreensaverRegistered: () => Promise.resolve(false)
    } as unknown as typeof window.electron
    usePlayerStore.setState({ isSettingsOpen: true, settingsTab: 'general' })
  })

  it('shows the blur at once and fades only the dim', () => {
    const { getByTestId } = render(<SettingsModal />)
    const blur = getByTestId('settings-blur')
    const dim = getByTestId('settings-dim')
    expect(blur.className).toContain('backdrop-blur-[6px]')
    expect(blur.className).not.toContain('bg-black')
    expect(blur.style.opacity).toBe('1')
    expect(dim.className).toContain('bg-black/55')
    expect(dim.className).not.toContain('backdrop-blur')
  })
})
