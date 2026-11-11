import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAutoHide } from '../useAutoHide'

describe('full-screen controls auto-hide', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shortcut and media keys act without revealing the controls', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => {
      for (const key of [' ', 'ArrowRight', 'ArrowLeft', 'l', 'p', 'MediaPlayPause', 'Escape']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }))
      }
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('Tab and Shift+Tab reveal the controls, which hide again after the idle time', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    })
    expect(result.current.isVisible).toBe(true)
    act(() => vi.advanceTimersByTime(3100))
    expect(result.current.isVisible).toBe(false)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    })
    expect(result.current.isVisible).toBe(true)
  })

  it('pointer jitter does not reveal the controls; a real move does', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => result.current.handlePointerMove({ clientX: 500, clientY: 400, type: 'pointermove' }))
    act(() => result.current.handlePointerMove({ clientX: 502, clientY: 401, type: 'pointermove' }))
    act(() => result.current.handlePointerMove({ clientX: 498, clientY: 403, type: 'pointermove' }))
    expect(result.current.isVisible).toBe(false)
    act(() => result.current.handlePointerMove({ clientX: 540, clientY: 420, type: 'pointermove' }))
    expect(result.current.isVisible).toBe(true)
  })

  it('a click reveals the controls even without movement', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => result.current.handlePointerMove({ clientX: 10, clientY: 10, type: 'pointerdown' }))
    expect(result.current.isVisible).toBe(true)
  })

  it('stays visible while keyboard focus is inside the controls', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => result.current.setHold(true))
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.isVisible).toBe(true)
    act(() => result.current.setHold(false))
    expect(result.current.isVisible).toBe(true)
    act(() => vi.advanceTimersByTime(3100))
    expect(result.current.isVisible).toBe(false)
  })

  it('a timer started before focus arrived does not hide the focused controls', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => result.current.handlePointerMove())
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.setHold(true))
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.isVisible).toBe(true)
  })

  it('removes its key listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useAutoHide(3000))
    unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
