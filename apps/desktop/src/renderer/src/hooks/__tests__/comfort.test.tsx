import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { prefersReducedMotion, useMoreContrast, useReducedMotion } from '../useReducedMotion'
import { moveBetweenRegions } from '../useKeyboardShortcuts'

let matches: Record<string, boolean> = {}
const listeners = new Set<() => void>()
beforeEach(() => {
  matches = {}
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(
    (q: string) =>
      ({
        get matches() {
          return Boolean(matches[q])
        },
        media: q,
        addEventListener: (_: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: () => void) => listeners.delete(cb)
      }) as unknown as MediaQueryList
  ) })
  usePlayerStore.setState({ motionPref: 'system', contrastPref: 'system' })
})
afterEach(() => {
  vi.restoreAllMocks()
  listeners.clear()
  delete (window as unknown as { matchMedia?: unknown }).matchMedia
})

describe('one reduced-motion answer', () => {
  it('follows the in-app switch, Windows, or both', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => usePlayerStore.setState({ motionPref: 'reduced' }))
    expect(result.current).toBe(true)
    expect(prefersReducedMotion()).toBe(true)
    act(() => usePlayerStore.setState({ motionPref: 'system' }))
    expect(result.current).toBe(false)
    act(() => {
      matches['(prefers-reduced-motion: reduce)'] = true
      listeners.forEach((l) => l())
    })
    expect(result.current).toBe(true)
  })

  it('more contrast follows the switch or Windows', () => {
    const { result } = renderHook(() => useMoreContrast())
    expect(result.current).toBe(false)
    act(() => usePlayerStore.setState({ contrastPref: 'more' }))
    expect(result.current).toBe(true)
  })
})

describe('F6 moves between the side rail, the page and the dock', () => {
  it('cycles forward and back, skipping inert regions', () => {
    const { container } = render(
      <div>
        <aside data-region="rail">
          <button>Deck</button>
        </aside>
        <main data-region="page">
          <button>Share</button>
        </main>
        <div data-region="dock">
          <button>Play</button>
        </div>
      </div>
    )
    // jsdom has no layout: treat every element as on screen.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    const [deck, share, play] = [...container.querySelectorAll('button')]
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(deck)
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(share)
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(play)
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(deck)
    moveBetweenRegions(-1)
    expect(document.activeElement).toBe(play)
    container.querySelector('main')!.setAttribute('inert', '')
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(deck)
    moveBetweenRegions(1)
    expect(document.activeElement).toBe(play)
  })
})
