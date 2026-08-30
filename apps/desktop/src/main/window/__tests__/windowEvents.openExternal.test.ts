import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupWindowEvents } from '../windowEvents'
import { shell } from 'electron'

// Mock electron shell
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn()
  },
  app: {
    isPackaged: false,
    getAppPath: () => ''
  }
}))

// Mock WindowManager to prevent its side effects
vi.mock('../WindowManager', () => ({
  WindowManager: {
    getInstance: () => ({
      isBackgroundEnabled: false,
      isQuitting: false
    })
  }
}))

describe('windowEvents - openExternal Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects arbitrary protocols and only allows HTTP/HTTPS', () => {
    let capturedHandler: ((details: { url: string }) => { action: string }) | null = null

    const mockWindow = {
      on: vi.fn(),
      show: vi.fn(),
      isVisible: vi.fn().mockReturnValue(true),
      isDestroyed: vi.fn().mockReturnValue(false),
      hide: vi.fn(),
      webContents: {
        send: vi.fn(),
        setWindowOpenHandler: vi.fn((handler) => {
          capturedHandler = handler
        })
      }
    } as any

    setupWindowEvents(mockWindow, false)

    expect(capturedHandler).not.toBeNull()
    const handler = capturedHandler!

    // 1. https -> allowed
    expect(handler({ url: 'https://example.com' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
    vi.clearAllMocks()

    // 2. http -> allowed
    expect(handler({ url: 'http://example.com' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).toHaveBeenCalledWith('http://example.com')
    vi.clearAllMocks()

    // 3. file -> rejected
    expect(handler({ url: 'file:///C:/Windows/System32/cmd.exe' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).not.toHaveBeenCalled()
    
    // 4. javascript -> rejected
    expect(handler({ url: 'javascript:alert(1)' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).not.toHaveBeenCalled()

    // 5. data -> rejected
    expect(handler({ url: 'data:text/html,<h1>Hello</h1>' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).not.toHaveBeenCalled()

    // 6. arbitrary custom protocol -> rejected
    expect(handler({ url: 'smb://server/share' })).toEqual({ action: 'deny' })
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})
