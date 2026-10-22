import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAutoHide } from '../useAutoHide'

describe('full-screen controls auto-hide', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a key press shows the controls, which hide again after the idle time', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    expect(result.current.isVisible).toBe(false)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    })
    expect(result.current.isVisible).toBe(true)
    act(() => vi.advanceTimersByTime(3100))
    expect(result.current.isVisible).toBe(false)
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
