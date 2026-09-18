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
      getAppVersion: vi.fn().mockResolvedValue('4.1.1'),
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

describe('SettingsModal In-App Update System', () => {
  let checkForUpdatesMock: ReturnType<typeof vi.fn>
  let downloadUpdateMock: ReturnType<typeof vi.fn>
  let cancelUpdateMock: ReturnType<typeof vi.fn>
  let installUpdateMock: ReturnType<typeof vi.fn>
  let getUpdateStatusMock: ReturnType<typeof vi.fn>
  let onUpdateStatusChangedMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    checkForUpdatesMock = vi.fn()
    downloadUpdateMock = vi.fn()
    cancelUpdateMock = vi.fn()
    installUpdateMock = vi.fn().mockResolvedValue({ success: true, action: 'restarting' })
    getUpdateStatusMock = vi.fn().mockResolvedValue({
      state: 'idle',
      currentVersion: '4.0.0',
      updateInfo: null,
      progress: null,
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })
    onUpdateStatusChangedMock = vi.fn().mockReturnValue(() => {})

    window.electron = {
      getAppVersion: vi.fn().mockResolvedValue('4.0.0'),
      getUpdateStatus: getUpdateStatusMock,
      checkForUpdates: checkForUpdatesMock,
      downloadUpdate: downloadUpdateMock,
      cancelUpdate: cancelUpdateMock,
      installUpdate: installUpdateMock,
      onUpdateStatusChanged: onUpdateStatusChangedMock,
      openExternal: vi.fn(),
      isScreensaverRegistered: vi.fn().mockResolvedValue(false)
    } as any

    usePlayerStore.setState({
      isSettingsOpen: true
    })
  })

  afterEach(() => {
    delete (window as Partial<Window>).electron
    vi.restoreAllMocks()
  })

  it('renders idle version state and invokes checkForUpdates on click', async () => {
    checkForUpdatesMock.mockResolvedValue({
      state: 'up-to-date',
      currentVersion: '4.0.0',
      updateInfo: null,
      progress: null,
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    render(<SettingsModal />)

    const checkBtn = await screen.findByRole('button', { name: 'Check for Updates' })
    expect(checkBtn).toBeInTheDocument()

    fireEvent.click(checkBtn)
    await waitFor(() => {
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1)
    })
  })

  it('renders available update with Download Update and View Release actions', async () => {
    getUpdateStatusMock.mockResolvedValue({
      state: 'available',
      currentVersion: '4.0.0',
      updateInfo: {
        version: 'v4.1.1',
        releaseName: 'Kissa v4.1.1',
        assetName: 'Kissa-Setup-4.1.1.exe',
        assetSize: 267336266,
        downloadUrl: 'https://github.com/NamanOG/Kissa/releases/download/v4.1.1/Kissa-Setup-4.1.1.exe',
        isPortable: false
      },
      progress: null,
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    downloadUpdateMock.mockResolvedValue({
      state: 'downloading',
      currentVersion: '4.0.0',
      updateInfo: {
        version: 'v4.1.1',
        releaseName: 'Kissa v4.1.1',
        assetName: 'Kissa-Setup-4.1.1.exe',
        assetSize: 267336266,
        downloadUrl: 'https://github.com/NamanOG/Kissa/releases/download/v4.1.1/Kissa-Setup-4.1.1.exe',
        isPortable: false
      },
      progress: { percent: 0, transferredBytes: 0, totalBytes: 267336266, bytesPerSecond: 0 },
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    render(<SettingsModal />)

    expect(await screen.findByText(/Kissa v4\.1\.1 is available/)).toBeInTheDocument()
    const downloadBtn = screen.getByRole('button', { name: 'Download Update' })
    expect(downloadBtn).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Release' })).toBeInTheDocument()

    fireEvent.click(downloadBtn)
    await waitFor(() => {
      expect(downloadUpdateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('renders downloading state with percentage and Cancel button', async () => {
    getUpdateStatusMock.mockResolvedValue({
      state: 'downloading',
      currentVersion: '4.0.0',
      updateInfo: {
        version: 'v4.1.1',
        releaseName: 'Kissa v4.1.1',
        assetName: 'Kissa-Setup-4.1.1.exe',
        assetSize: 200000000,
        downloadUrl: 'https://github.com/NamanOG/Kissa/releases/download/v4.1.1/Kissa-Setup-4.1.1.exe',
        isPortable: false
      },
      progress: { percent: 45, transferredBytes: 90000000, totalBytes: 200000000, bytesPerSecond: 1000000 },
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    render(<SettingsModal />)

    expect(await screen.findByText(/Downloading v4\.1\.1… 45%/)).toBeInTheDocument()
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    expect(cancelBtn).toBeInTheDocument()

    fireEvent.click(cancelBtn)
    await waitFor(() => {
      expect(cancelUpdateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('renders downloaded state and handles confirmation before restart', async () => {
    getUpdateStatusMock.mockResolvedValue({
      state: 'downloaded',
      currentVersion: '4.0.0',
      updateInfo: {
        version: 'v4.1.1',
        releaseName: 'Kissa v4.1.1',
        assetName: 'Kissa-Setup-4.1.1.exe',
        assetSize: 200000000,
        downloadUrl: 'https://github.com/NamanOG/Kissa/releases/download/v4.1.1/Kissa-Setup-4.1.1.exe',
        isPortable: false
      },
      progress: { percent: 100, transferredBytes: 200000000, totalBytes: 200000000, bytesPerSecond: 0 },
      downloadedFilePath: 'C:\\temp\\Kissa-Setup-4.1.1.exe',
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    render(<SettingsModal />)

    expect(await screen.findByText('Update ready to install')).toBeInTheDocument()
    const installBtn = screen.getByRole('button', { name: 'Restart & Install' })

    // Clicking Restart & Install asks for confirmation
    fireEvent.click(installBtn)
    expect(
      screen.getByText('Restart Kissa now to apply update? Active playback will stop.')
    ).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: 'Restart Now' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(installUpdateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('handles portable downloaded state with Show in Folder action', async () => {
    installUpdateMock.mockResolvedValue({ success: true, action: 'revealed' })

    getUpdateStatusMock.mockResolvedValue({
      state: 'downloaded',
      currentVersion: '4.0.0',
      updateInfo: {
        version: 'v4.1.1',
        releaseName: 'Kissa v4.1.1',
        assetName: 'Kissa-Portable-4.1.1.exe',
        assetSize: 200000000,
        downloadUrl: 'https://github.com/NamanOG/Kissa/releases/download/v4.1.1/Kissa-Portable-4.1.1.exe',
        isPortable: true
      },
      progress: { percent: 100, transferredBytes: 200000000, totalBytes: 200000000, bytesPerSecond: 0 },
      downloadedFilePath: 'C:\\Downloads\\Kissa-Portable-4.1.1.exe',
      error: null,
      isScreensaverActive: false,
      isPortable: true
    })

    render(<SettingsModal />)

    expect(await screen.findByText('Portable update downloaded to Downloads')).toBeInTheDocument()
    const showBtn = screen.getByRole('button', { name: 'Show in Folder' })
    expect(showBtn).toBeInTheDocument()

    fireEvent.click(showBtn)
    await waitFor(() => {
      expect(installUpdateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('renders error state with Try Again action', async () => {
    getUpdateStatusMock.mockResolvedValue({
      state: 'error',
      currentVersion: '4.0.0',
      updateInfo: null,
      progress: null,
      downloadedFilePath: null,
      error: 'Download interrupted by network failure',
      isScreensaverActive: false,
      isPortable: false
    })

    render(<SettingsModal />)

    expect(await screen.findByText('Download interrupted by network failure')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: 'Try Again' })
    expect(retryBtn).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Release' })).toBeInTheDocument()

    fireEvent.click(retryBtn)
    await waitFor(() => {
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1)
    })
  })
})
