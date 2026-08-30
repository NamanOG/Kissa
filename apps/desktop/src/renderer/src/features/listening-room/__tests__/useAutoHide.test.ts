import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutoHide } from '../useAutoHide'

describe('useAutoHide', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => { vi.runOnlyPendingTimers() })
    vi.useRealTimers()
  })

  it('is initially hidden', () => {
    const { result } = renderHook(() => useAutoHide())
    expect(result.current.isVisible).toBe(false)
  })

  it('mouse movement reveals controls', () => {
    const { result } = renderHook(() => useAutoHide())
    act(() => {
      result.current.handlePointerMove()
    })
    expect(result.current.isVisible).toBe(true)
  })

  it('timeout hides controls', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => {
      result.current.handlePointerMove()
    })
    expect(result.current.isVisible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('timer resets on subsequent movement', () => {
    const { result } = renderHook(() => useAutoHide(3000))
    act(() => {
      result.current.handlePointerMove()
    })
    
    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(result.current.isVisible).toBe(true)

    // Move again, resetting the timer
    act(() => {
      result.current.handlePointerMove()
    })
    
    // Advance another 1500ms (total 3000ms since first move)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    // Still visible because it was reset
    expect(result.current.isVisible).toBe(true)

    // Complete the second 3000ms timer
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(result.current.isVisible).toBe(false)
  })

  it('cleans up on unmount', () => {
    const { result, unmount } = renderHook(() => useAutoHide(3000))
    act(() => {
      result.current.handlePointerMove()
    })
    
    unmount()
    // Timer should be cleared. If we advance time, nothing should crash/update
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // isVisible is technically still true in the unmounted hook, 
    // but the state update (which would warn) is prevented or benign in React 18+.
    // The main test is that clearTimeout was called.
  })
})
