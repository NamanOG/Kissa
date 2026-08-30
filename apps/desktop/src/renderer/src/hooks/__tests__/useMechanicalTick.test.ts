import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMechanicalTick } from '../useMechanicalTick'

describe('useMechanicalTick', () => {
  const mockOscillator = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: '',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  }

  const mockGainNode = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  }

  const mockFilterNode = {
    connect: vi.fn(),
    type: '',
    frequency: {
      value: 0
    }
  }

  class MockAudioContext {
    state = 'running'
    resume = vi.fn().mockResolvedValue(undefined)
    createOscillator = vi.fn().mockReturnValue(mockOscillator)
    createGain = vi.fn().mockReturnValue(mockGainNode)
    createBiquadFilter = vi.fn().mockReturnValue(mockFilterNode)
    destination = {}
    currentTime = 0
  }

  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    
    // Clear last tick state since it's a module level variable we don't have direct access to,
    // we use mock performance.now() to control the time completely.
    let currentTime = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime)
    
    // helper to advance time
    ;(global as any).advanceTime = (ms: number) => {
      currentTime += ms
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    delete (global as any).advanceTime
  })

  it('plays a synthesized mechanical tick when called', () => {
    const { result } = renderHook(() => useMechanicalTick())
    
    result.current() // Call playTick
    
    // Since we create a new instance, we should spy on the prototype or just check if the mockOscillator methods were called
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()
  })

  it('throttles calls within the 35ms window', () => {
    const { result } = renderHook(() => useMechanicalTick())
    
    result.current() // Initial call
    expect(mockOscillator.start).toHaveBeenCalledTimes(1)
    
    // Call immediately again (should be throttled)
    ;(global as any).advanceTime(10)
    result.current()
    expect(mockOscillator.start).toHaveBeenCalledTimes(1)
    
    // Advance time beyond the 35ms threshold
    ;(global as any).advanceTime(30) // total 40ms since first call
    
    // Call again (should play)
    result.current()
    expect(mockOscillator.start).toHaveBeenCalledTimes(2)
  })

  it('silently catches errors if AudioContext fails (e.g. autoplay block)', () => {
    class FailingAudioContext {
      constructor() {
        throw new Error('Not allowed')
      }
    }
    vi.stubGlobal('AudioContext', FailingAudioContext)
    
    const { result } = renderHook(() => useMechanicalTick())
    
    expect(() => {
      result.current()
    }).not.toThrow()
  })
})
