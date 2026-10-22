import { describe, expect, it, vi } from 'vitest'
import { attachVisibilityEventSync } from '../windowEvents'

/** Minimise and tray hide do not change document.hidden on Windows, so the main process tells the renderer. */
function fakeWindow() {
  const listeners = new Map<string, () => void>()
  const contentListeners = new Map<string, () => void>()
  const state = { visible: true, minimized: false, destroyed: false }
  const send = vi.fn()
  const win = {
    on: vi.fn((event: string, cb: () => void) => void listeners.set(event, cb)),
    isDestroyed: () => state.destroyed,
    isVisible: () => state.visible,
    isMinimized: () => state.minimized,
    webContents: { send, on: vi.fn((event: string, cb: () => void) => void contentListeners.set(event, cb)) }
  }
  attachVisibilityEventSync(win as never)
  return { listeners, contentListeners, state, send }
}

describe('window visibility sync', () => {
  it('reports minimise and restore', () => {
    const w = fakeWindow()
    w.state.minimized = true
    w.listeners.get('minimize')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', false)
    w.state.minimized = false
    w.listeners.get('restore')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', true)
  })

  it('reports hide to tray and show', () => {
    const w = fakeWindow()
    w.state.visible = false
    w.listeners.get('hide')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', false)
    w.state.visible = true
    w.listeners.get('show')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', true)
  })

  it('reports visible again when the window takes focus without a show event', () => {
    const w = fakeWindow()
    w.state.visible = false
    w.listeners.get('hide')!()
    w.state.visible = true
    w.listeners.get('focus')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', true)
  })

  it('reports the current state after a reload, and stays quiet once destroyed', () => {
    const w = fakeWindow()
    w.contentListeners.get('did-finish-load')!()
    expect(w.send).toHaveBeenLastCalledWith('kissa:window-visibility', true)
    w.send.mockClear()
    w.state.destroyed = true
    w.listeners.get('minimize')!()
    expect(w.send).not.toHaveBeenCalled()
  })
})
