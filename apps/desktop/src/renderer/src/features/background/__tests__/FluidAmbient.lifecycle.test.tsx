import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { FluidAmbient } from '../FluidAmbient'
import { controlledCovers, makeFakeGl, type FakeGl } from './fakeGl'

/*
 * Component-level lifecycle with a fake WebGL context and covers that succeed or fail on cue.
 * The real renderer code runs; only the GPU and the network are stand-ins.
 */

let fakes: FakeGl[] = []
let visibility: ((v: boolean) => void) | null = null

beforeEach(() => {
  fakes = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, kind: string) {
    if (kind !== 'webgl') return null
    const f = makeFakeGl()
    fakes.push(f)
    return f.gl
  } as unknown as HTMLCanvasElement['getContext'])
  ;(window as unknown as { electron: unknown }).electron = {
    onWindowVisibility: (cb: (v: boolean) => void) => {
      visibility = cb
      return () => {
        visibility = null
      }
    }
  }
  usePlayerStore.setState({ isPlaying: true, isMiniPlayer: false, activeView: 'deck' })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as unknown as { electron?: unknown }).electron
  document.documentElement.removeAttribute('data-moving-light')
})

const flush = async (): Promise<void> => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}
const still = (c: HTMLElement): boolean => Boolean(c.querySelector('[data-ambient="still"]'))
const blurOff = (): boolean => document.documentElement.hasAttribute('data-moving-light')

describe('Moving light component lifecycle (fake WebGL, controlled covers)', () => {
  it('bad cover A, then good cover B: the still image shows for A only', async () => {
    const covers = controlledCovers()
    const { container, rerender } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.fail('A')
    await flush()
    expect(still(container)).toBe(true)
    expect(blurOff()).toBe(false) // nothing moves while the cover failed
    rerender(<FluidAmbient artworkUrl="B" coverLoader={covers.load} />)
    covers.succeed('B')
    await flush()
    expect(still(container)).toBe(false)
    expect(blurOff()).toBe(true)
  })

  it('A fails, B loads, A becomes readable again: A recovers without a restart', async () => {
    const covers = controlledCovers()
    const { container, rerender } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.fail('A')
    await flush()
    rerender(<FluidAmbient artworkUrl="B" coverLoader={covers.load} />)
    covers.succeed('B')
    await flush()
    rerender(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.succeed('A')
    await flush()
    expect(still(container)).toBe(false)
  })

  it('a transient failure is retried once for the same track', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const covers = controlledCovers()
      const { container } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
      covers.fail('A')
      await act(async () => {
        await Promise.resolve()
      })
      expect(still(container)).toBe(true)
      await act(async () => {
        vi.advanceTimersByTime(5100)
      })
      covers.succeed('A')
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(still(container)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rapid A, B, C with results out of order: only C counts', async () => {
    const covers = controlledCovers()
    const { container, rerender } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    rerender(<FluidAmbient artworkUrl="B" coverLoader={covers.load} />)
    rerender(<FluidAmbient artworkUrl="C" coverLoader={covers.load} />)
    covers.succeed('C')
    covers.fail('A')
    covers.fail('B')
    await flush()
    expect(still(container)).toBe(false)
  })

  it('a failure while paused or hidden still shows the still image, with no loop', async () => {
    usePlayerStore.setState({ isPlaying: false })
    const covers = controlledCovers()
    const { container } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    act(() => visibility?.(false))
    covers.fail('A')
    await flush()
    expect(still(container)).toBe(true)
    expect(blurOff()).toBe(false)
  })

  it('stops when minimised or hidden to the tray, and resumes on restore', async () => {
    const covers = controlledCovers()
    render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.succeed('A')
    await flush()
    expect(blurOff()).toBe(true)
    act(() => visibility?.(false))
    expect(blurOff()).toBe(false)
    act(() => visibility?.(true))
    expect(blurOff()).toBe(true)
  })

  it('a lost context switches to the still image and releases everything, including the blur override', async () => {
    const covers = controlledCovers()
    const { container } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.succeed('A')
    await flush()
    const canvas = container.querySelector('canvas')!
    const fake = fakes[fakes.length - 1]
    fake.lost = true
    act(() => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    await flush()
    expect(container.querySelector('canvas')).toBeNull()
    expect(still(container)).toBe(true)
    expect(blurOff()).toBe(false)
    expect(fake.live.size).toBe(0)
    expect(fake.contextReleased).toBe(true)
  })

  it('turning Moving light off (unmount) releases the context, canvas, listeners and blur override', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const covers = controlledCovers()
    const { container, unmount } = render(<FluidAmbient artworkUrl="A" coverLoader={covers.load} />)
    covers.succeed('A')
    await flush()
    unmount()
    for (const f of fakes) {
      expect(f.live.size).toBe(0)
      expect(f.contextReleased).toBe(true)
    }
    expect(container.querySelector('canvas')).toBeNull()
    expect(blurOff()).toBe(false)
    expect(visibility).toBeNull()
    const added = add.mock.calls.filter(([t]) => t === 'resize').length
    const removed = remove.mock.calls.filter(([t]) => t === 'resize').length
    expect(removed).toBe(added)
  })

  it('repeated on/off leaves no live resources or canvases behind', async () => {
    const covers = controlledCovers()
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(<FluidAmbient artworkUrl={`A${i}`} coverLoader={covers.load} />)
      covers.succeed(`A${i}`)
      await flush()
      unmount()
    }
    expect(fakes.every((f) => f.live.size === 0 && f.contextReleased)).toBe(true)
    expect(document.querySelectorAll('canvas').length).toBe(0)
  })
})
