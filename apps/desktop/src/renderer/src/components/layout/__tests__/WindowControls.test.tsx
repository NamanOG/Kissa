import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { WindowControls } from '../WindowControls'

afterEach(() => {
  delete (window as unknown as { electron?: unknown }).electron
})

function mockApi(maximized = false) {
  let cb: ((m: boolean) => void) | null = null
  const api = {
    windowControl: vi.fn(() => Promise.resolve()),
    getWindowMaximized: vi.fn(() => Promise.resolve(maximized)),
    onWindowMaximized: vi.fn((fn: (m: boolean) => void) => {
      cb = fn
      return () => (cb = null)
    })
  }
  ;(window as unknown as { electron: unknown }).electron = api
  return { api, emit: (m: boolean) => cb?.(m), listening: () => cb !== null }
}

describe('WindowControls', () => {
  it('sends minimise, maximise and close, each a named, focusable button', () => {
    const { api } = mockApi()
    render(<WindowControls />)
    for (const [name, action] of [
      ['Minimise', 'minimize'],
      ['Maximise', 'toggle-maximize'],
      ['Close', 'close']
    ] as const) {
      const b = screen.getByRole('button', { name })
      expect(b.tabIndex).toBe(0)
      fireEvent.click(b)
      expect(api.windowControl).toHaveBeenLastCalledWith(action)
    }
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-keyshortcuts')).toBe('Alt+F4')
  })

  it('swaps Maximise for Restore when the window is maximised, and unsubscribes', async () => {
    const m = mockApi(true)
    const { unmount } = render(<WindowControls />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'Restore' }).getAttribute('aria-keyshortcuts')).toBe('Win+↓')
    act(() => m.emit(false))
    expect(screen.getByRole('button', { name: 'Maximise' }).getAttribute('aria-keyshortcuts')).toBe('Win+↑')
    unmount()
    expect(m.listening()).toBe(false)
  })

  it('renders without the bridge (tests, the harness)', () => {
    render(<WindowControls />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })
})
