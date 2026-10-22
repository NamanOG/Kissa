import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

describe('useMechanicalTick', () => {
  const started = vi.fn()

  class MockAudioContext {
    state = 'running'
    sampleRate = 48000
    destination = {}
    resume = vi.fn().mockResolvedValue(undefined)
    createBuffer = vi.fn((_ch: number, length: number) => {
      const data = new Float32Array(length)
      return { getChannelData: () => data }
    })
    createBufferSource = vi.fn(() => ({ buffer: null, connect: vi.fn(), start: started }))
    createGain = vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() }))
    decodeAudioData = vi.fn(async () => ({ duration: 0.03 }))
  }
  // The tick is a recording: fetched and decoded once, then played from memory.
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0))
  }

  let now = 1000
  beforeEach(async () => {
    vi.resetModules()
    started.mockClear()
    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
    now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('plays the tick recording through one buffer source, decoding it only once', async () => {
    const { useMechanicalTick } = await import('../useMechanicalTick')
    const { result } = renderHook(() => useMechanicalTick())
    result.current()
    await settle()
    expect(started).toHaveBeenCalledTimes(1)
    now += 100
    result.current()
    expect(started).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('throttles calls within the 35ms window', async () => {
    const { useMechanicalTick } = await import('../useMechanicalTick')
    const { result } = renderHook(() => useMechanicalTick())
    result.current()
    await settle()
    now += 10
    result.current()
    expect(started).toHaveBeenCalledTimes(1)
    now += 30
    result.current()
    expect(started).toHaveBeenCalledTimes(2)
  })

  it('silently does nothing if audio is unavailable (e.g. autoplay block)', async () => {
    class FailingAudioContext {
      constructor() {
        throw new Error('Not allowed')
      }
    }
    vi.stubGlobal('AudioContext', FailingAudioContext)
    const { useMechanicalTick } = await import('../useMechanicalTick')
    const { result } = renderHook(() => useMechanicalTick())
    expect(() => result.current()).not.toThrow()
  })
})
