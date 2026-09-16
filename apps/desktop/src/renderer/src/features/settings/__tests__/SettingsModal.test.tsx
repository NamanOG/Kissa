import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsModal } from '../SettingsModal'
import { usePlayerStore } from '@renderer/stores/playerStore'

vi.mock('framer-motion', async () => {
  const actual = (await vi.importActual('framer-motion')) as any
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: ({ children, className, onClick }: any) => (
        <div className={className} onClick={onClick}>
          {children}
        </div>
      )
    }
  }
})

describe('SettingsModal Windows Screensaver integration', () => {
  let isScreensaverRegisteredMock: ReturnType<typeof vi.fn>
  let registerScreensaverMock: ReturnType<typeof vi.fn>
  let unregisterScreensaverMock: ReturnType<typeof vi.fn>
  let openScreensaverSettingsMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    isScreensaverRegisteredMock = vi.fn().mockResolvedValue(false)
    registerScreensaverMock = vi.fn().mockResolvedValue({ success: true })
    unregisterScreensaverMock = vi.fn().mockResolvedValue({ success: true, removed: true })
    openScreensaverSettingsMock = vi.fn().mockResolvedValue({ success: true })

    window.electron = {
      getAppVersion: vi.fn().mockResolvedValue('4.1.0'),
      isScreensaverRegistered: isScreensaverRegisteredMock,
      registerScreensaver: registerScreensaverMock,
      unregisterScreensaver: unregisterScreensaverMock,
      openScreensaverSettings: openScreensaverSettingsMock
    } as any

    usePlayerStore.setState({
      isSettingsOpen: true,
      hasUpdateAvailable: false
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
    vi.restoreAllMocks()
  })

  it('renders Set as Windows Screensaver when not registered', async () => {
    render(<SettingsModal />)

    expect(screen.getByText('Windows Screensaver')).toBeInTheDocument()

    const setButton = await screen.findByRole('button', { name: 'Set as Windows Screensaver' })
    expect(setButton).toBeInTheDocument()
    expect(
      screen.getByText('Kissa can run as your Windows screensaver, using the Listening Display experience.')
    ).toBeInTheDocument()
  })

  it('handles registration flow when clicking Set as Windows Screensaver', async () => {
    render(<SettingsModal />)

    const setButton = await screen.findByRole('button', { name: 'Set as Windows Screensaver' })
    fireEvent.click(setButton)

    await waitFor(() => {
      expect(registerScreensaverMock).toHaveBeenCalledTimes(1)
    })

    expect(
      await screen.findByRole('button', { name: 'Remove Kissa Screensaver' })
    ).toBeInTheDocument()
    expect(screen.getByText('✓ Kissa is your Windows screensaver')).toBeInTheDocument()
  })

  it('handles unregistration flow when clicking Remove Kissa Screensaver', async () => {
    isScreensaverRegisteredMock.mockResolvedValue(true)
    render(<SettingsModal />)

    const removeButton = await screen.findByRole('button', { name: 'Remove Kissa Screensaver' })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(unregisterScreensaverMock).toHaveBeenCalledTimes(1)
    })

    expect(
      await screen.findByRole('button', { name: 'Set as Windows Screensaver' })
    ).toBeInTheDocument()
  })

  it('toggles Screensaver & Display Lyrics option', async () => {
    usePlayerStore.setState({ screensaverLyrics: false })
    render(<SettingsModal />)

    expect(screen.getByText('Screensaver & Display Lyrics')).toBeInTheDocument()
    const toggleButton = screen.getByRole('switch', { name: 'Toggle Screensaver Lyrics' })
    expect(toggleButton).toBeInTheDocument()

    fireEvent.click(toggleButton)
    expect(usePlayerStore.getState().screensaverLyrics).toBe(true)

    fireEvent.click(toggleButton)
    expect(usePlayerStore.getState().screensaverLyrics).toBe(false)
  })

  it('renders and invokes Open Windows Screensaver Settings button', async () => {
    render(<SettingsModal />)

    const openButton = await screen.findByRole('button', { name: 'Open Windows Screensaver Settings' })
    expect(openButton).toBeInTheDocument()

    fireEvent.click(openButton)
    expect(openScreensaverSettingsMock).toHaveBeenCalledTimes(1)
  })
})
