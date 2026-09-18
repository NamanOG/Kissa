import { describe, expect, it, vi, beforeEach } from 'vitest'
import { WindowManager } from '../WindowManager'

describe('WindowManager screensaver transitions', () => {
  let wm: WindowManager
  let mockWindow: any

  beforeEach(() => {
    wm = WindowManager.getInstance()
    wm.isScreensaver = false

    mockWindow = {
      isDestroyed: vi.fn(() => false),
      isFullScreen: vi.fn(() => false),
      isMaximized: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      isVisible: vi.fn(() => true),
      getBounds: vi.fn(() => ({ x: 150, y: 120, width: 900, height: 670 })),
      setBounds: vi.fn(),
      setFullScreen: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      restore: vi.fn(),
      maximize: vi.fn(),
      minimize: vi.fn(),
      webContents: {
        send: vi.fn()
      }
    }

    // Set private mainWindow for testing
    ;(wm as any).mainWindow = mockWindow
    ;(wm as any).savedWindowState = null
  })

  it('preserves existing window bounds and transitions window into fullscreen screensaver mode', () => {
    const success = wm.enterScreensaverMode()

    expect(success).toBe(true)
    expect(wm.isScreensaver).toBe(true)
    expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true)
    expect(mockWindow.focus).toHaveBeenCalled()
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('kissa:screensaver-mode-changed', true)
  })

  it('restores previous bounds, non-fullscreen state, and notifies renderer upon wake', () => {
    mockWindow.getBounds.mockReturnValue({ x: 200, y: 250, width: 850, height: 620 })
    mockWindow.isFullScreen.mockReturnValue(false)

    wm.enterScreensaverMode()
    // Now window is in fullscreen screensaver mode
    mockWindow.isFullScreen.mockReturnValue(true)

    wm.exitScreensaverMode()

    expect(wm.isScreensaver).toBe(false)
    expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false)
    expect(mockWindow.setBounds).toHaveBeenCalledWith({ x: 200, y: 250, width: 850, height: 620 })
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('kissa:screensaver-mode-changed', false)
  })

  it('restores minimized or hidden state if Kissa was in background when screensaver activated', () => {
    mockWindow.isVisible.mockReturnValue(false)
    mockWindow.isMinimized.mockReturnValue(true)

    wm.enterScreensaverMode()

    expect(mockWindow.restore).toHaveBeenCalled()
    expect(mockWindow.show).toHaveBeenCalled()

    // After exitScreensaverMode, the window is always left visible and focused
    // so the user can interact after waking the screensaver.
    // Re-hiding or re-minimizing would cause a permanent blank-screen lockout.
    mockWindow.isVisible.mockReturnValue(false) // simulate still-hidden during exit
    wm.exitScreensaverMode()

    expect(mockWindow.minimize).not.toHaveBeenCalled()
    expect(mockWindow.hide).not.toHaveBeenCalled()
    expect(mockWindow.show).toHaveBeenCalled()
    expect(mockWindow.focus).toHaveBeenCalled()
  })

  it('restores maximized state without calling setBounds when window was originally maximized', () => {
    mockWindow.isMaximized.mockReturnValue(true)
    mockWindow.isFullScreen.mockReturnValue(false)

    wm.enterScreensaverMode()
    mockWindow.isFullScreen.mockReturnValue(true)

    wm.exitScreensaverMode()

    expect(wm.isScreensaver).toBe(false)
    expect(mockWindow.maximize).toHaveBeenCalled()
    expect(mockWindow.setBounds).not.toHaveBeenCalled()
  })

  it('prevents duplicate enterScreensaverMode calls from overwriting initial saved state', () => {
    mockWindow.getBounds.mockReturnValue({ x: 100, y: 100, width: 800, height: 600 })
    wm.enterScreensaverMode()

    // Simulate window bounds changing while in screensaver
    mockWindow.getBounds.mockReturnValue({ x: 0, y: 0, width: 1920, height: 1080 })
    const secondCall = wm.enterScreensaverMode()
    expect(secondCall).toBe(true)

    wm.exitScreensaverMode()
    // Original bounds must be restored, not the intermediate bounds
    expect(mockWindow.setBounds).toHaveBeenCalledWith({ x: 100, y: 100, width: 800, height: 600 })
  })

  it('safely treats exitScreensaverMode as a no-op when not in screensaver mode', () => {
    wm.isScreensaver = false
    wm.exitScreensaverMode()

    expect(mockWindow.webContents.send).not.toHaveBeenCalledWith('kissa:screensaver-mode-changed', false)
  })

  it('returns false safely if mainWindow is destroyed or unavailable', () => {
    ;(wm as any).mainWindow = null
    const success = wm.enterScreensaverMode()
    expect(success).toBe(false)
  })
})
