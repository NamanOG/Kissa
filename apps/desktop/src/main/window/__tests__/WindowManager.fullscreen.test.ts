import { describe, expect, it, vi } from 'vitest'
import { setWindowFullscreen } from '../WindowManager'
import { attachFullscreenEventSync } from '../windowEvents'

describe('setWindowFullscreen', () => {
  it('accepts boolean fullscreen values and returns the actual window state', () => {
    let isFullscreen = false
    const mainWindow = {
      setFullScreen: vi.fn((value: boolean) => {
        isFullscreen = value
      }),
      isFullScreen: vi.fn(() => isFullscreen)
    }

    expect(setWindowFullscreen(mainWindow, true)).toBe(true)
    expect(mainWindow.setFullScreen).toHaveBeenCalledWith(true)
  })

  it('rejects non-boolean fullscreen values without changing the window', () => {
    const mainWindow = {
      setFullScreen: vi.fn(),
      isFullScreen: vi.fn(() => false)
    }

    expect(setWindowFullscreen(mainWindow, 'true')).toBe(false)
    expect(mainWindow.setFullScreen).not.toHaveBeenCalled()
  })

  it('forwards native fullscreen enter and leave events to the renderer', () => {
    const listeners = new Map<string, () => void>()
    const send = vi.fn()
    const mainWindow = {
      on: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener)
      }),
      isDestroyed: vi.fn(() => false),
      webContents: { send }
    }

    attachFullscreenEventSync(mainWindow as never)
    listeners.get('enter-full-screen')?.()
    listeners.get('leave-full-screen')?.()

    expect(send).toHaveBeenNthCalledWith(1, 'kissa:fullscreen-changed', true)
    expect(send).toHaveBeenNthCalledWith(2, 'kissa:fullscreen-changed', false)
  })
})
