import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeDetection } from '../useWakeDetection'

describe('useWakeDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ignores events during the initial 500ms attach delay', () => {
    const onWake = vi.fn()
    renderHook(() => useWakeDetection(onWake))

    // Fire keydown immediately
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(onWake).not.toHaveBeenCalled()

    // Advance by 300ms (still within 500ms window)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(onWake).not.toHaveBeenCalled()
  })

  it('triggers wake on keydown after attach delay', () => {
    const onWake = vi.fn()
    renderHook(() => useWakeDetection(onWake))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('triggers wake on mousedown after attach delay', () => {
    const onWake = vi.fn()
    renderHook(() => useWakeDetection(onWake))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    window.dispatchEvent(new MouseEvent('mousedown'))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('filters out optical sensor micro-jitter (<8px) on mousemove', () => {
    const onWake = vi.fn()
    renderHook(() => useWakeDetection(onWake))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Initial position
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
    expect(onWake).not.toHaveBeenCalled()

    // Micro-jitter: 2px movement
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 102, clientY: 101 }))
    expect(onWake).not.toHaveBeenCalled()

    // Micro-jitter: 5px movement
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 105, clientY: 100 }))
    expect(onWake).not.toHaveBeenCalled()
  })

  it('triggers wake on intentional mouse movement (>8px)', () => {
    const onWake = vi.fn()
    renderHook(() => useWakeDetection(onWake))

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Initial position
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
    expect(onWake).not.toHaveBeenCalled()

    // Significant move: 20px movement
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 100 }))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('cleans up event listeners and timers on unmount', () => {
    const onWake = vi.fn()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useWakeDetection(onWake))
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
  })
})
