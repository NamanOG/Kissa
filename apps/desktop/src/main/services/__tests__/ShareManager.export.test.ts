import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => any>(),
  windows: [] as any[],
  clipboardWrite: vi.fn()
}))
vi.mock('electron', () => ({
  ipcMain: {
    handle: (name: string, fn: (...args: any[]) => any) => fixture.handlers.set(name, fn)
  },
  BrowserWindow: class {
    webContents = {
      setZoomFactor: vi.fn(),
      capturePage: vi.fn(async () => ({ getSize: () => ({ width: 1080, height: 1350 }) }))
    }
    destroy = vi.fn()
    loadURL = vi.fn(async () => {})
    constructor(public readonly options: any) {
      fixture.windows.push(this)
    }
  },
  clipboard: { writeImage: fixture.clipboardWrite },
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
  nativeImage: {},
  dialog: {}
}))
import { ShareManager } from '../ShareManager'

describe('share export handshake', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fixture.windows.length = 0
    fixture.clipboardWrite.mockClear()
    ShareManager.getInstance().init()
  })
  afterEach(() => vi.useRealTimers())

  const options = {
    action: 'copy',
    payload: {
      type: 'study',
      aspectRatio: '4:5',
      data: { room: 'forest', focusMinutes: 25, stepsDone: 2, stepsTotal: 3 }
    }
  }

  it('answers invoke from the export renderer, captures and clears its timeout', async () => {
    const exported = fixture.handlers.get('kissa:export-share')!({}, options)
    expect(fixture.handlers.has('kissa:share-ready')).toBe(true)
    const window = fixture.windows[0]
    expect(window.options.webPreferences.partition).toBe('kissa-share-export')
    expect(window.options.height).toBeLessThanOrEqual(1000)
    await fixture.handlers.get('kissa:share-ready')!({ sender: {} }, true)
    expect(fixture.clipboardWrite).not.toHaveBeenCalled()
    await fixture.handlers.get('kissa:share-ready')!({ sender: window.webContents }, true)
    expect(await exported).toBe(true)
    expect(fixture.clipboardWrite).toHaveBeenCalledOnce()
    expect(window.destroy).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(window.webContents.setZoomFactor).toHaveBeenCalledWith(
      window.options.webPreferences.zoomFactor
    )
  })

  it('refuses a concurrent export without abandoning the first caller', async () => {
    const exported = fixture.handlers.get('kissa:export-share')!({}, options)
    expect(await fixture.handlers.get('kissa:export-share')!({}, options)).toBe(false)
    expect(fixture.windows).toHaveLength(1)
    await fixture.handlers.get('kissa:share-ready')!(
      { sender: fixture.windows[0].webContents },
      false
    )
    expect(await exported).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
