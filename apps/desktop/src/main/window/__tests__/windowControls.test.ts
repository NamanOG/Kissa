import { describe, expect, it, vi } from 'vitest'
import { applyWindowControl, attachMaximizeEventSync } from '../windowEvents'

const win = (maximized = false) => ({
  isDestroyed: vi.fn(() => false),
  minimize: vi.fn(),
  isMaximized: vi.fn(() => maximized),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  close: vi.fn()
})

describe('Kissa caption buttons (main process)', () => {
  it('minimises, toggles maximise and closes through the normal close path', () => {
    const w = win()
    applyWindowControl(w as never, 'minimize')
    expect(w.minimize).toHaveBeenCalledOnce()
    applyWindowControl(w as never, 'toggle-maximize')
    expect(w.maximize).toHaveBeenCalledOnce()
    const m = win(true)
    applyWindowControl(m as never, 'toggle-maximize')
    expect(m.unmaximize).toHaveBeenCalledOnce()
    applyWindowControl(w as never, 'close')
    expect(w.close).toHaveBeenCalledOnce()
  })

  it('ignores unknown actions and a missing or destroyed window', () => {
    const w = win()
    applyWindowControl(w as never, 'explode')
    applyWindowControl(null, 'close')
    w.isDestroyed.mockReturnValue(true)
    applyWindowControl(w as never, 'close')
    expect(w.close).not.toHaveBeenCalled()
    expect(w.minimize).not.toHaveBeenCalled()
  })

  it('tells the page when the window is maximised or restored', () => {
    const handlers: Record<string, () => void> = {}
    const send = vi.fn()
    let maximized = false
    const w = {
      isDestroyed: () => false,
      isMaximized: () => maximized,
      on: (e: string, cb: () => void) => void (handlers[e] = cb),
      webContents: { send, on: (e: string, cb: () => void) => void (handlers['wc:' + e] = cb) }
    }
    attachMaximizeEventSync(w as never)
    maximized = true
    handlers.maximize()
    expect(send).toHaveBeenLastCalledWith('kissa:window-maximized', true)
    maximized = false
    handlers.unmaximize()
    expect(send).toHaveBeenLastCalledWith('kissa:window-maximized', false)
    handlers['wc:did-finish-load']()
    expect(send).toHaveBeenCalledTimes(3)
  })
})
