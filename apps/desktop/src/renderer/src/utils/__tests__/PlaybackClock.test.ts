import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaybackClock } from '../PlaybackClock'

type RafCallback = FrameRequestCallback

describe('PlaybackClock subscribers', () => {
  let animationFrameCallbacks: Map<number, RafCallback>
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>
  let nextAnimationFrameId: number
  let activeUnsubscribes: Array<() => void>

  const runNextAnimationFrame = (): void => {
    const nextFrame = animationFrameCallbacks.entries().next().value as
      [number, RafCallback] | undefined
    if (!nextFrame) throw new Error('Expected an animation frame callback')

    const [id, callback] = nextFrame
    animationFrameCallbacks.delete(id)
    callback(performance.now())
  }

  const subscribe = (callback: (time: number) => void): (() => void) => {
    const unsubscribe = PlaybackClock.subscribe(callback)
    activeUnsubscribes.push(unsubscribe)
    return unsubscribe
  }

  beforeEach(() => {
    animationFrameCallbacks = new Map()
    nextAnimationFrameId = 1
    activeUnsubscribes = []
    requestAnimationFrameMock = vi.fn((callback: RafCallback): number => {
      const id = nextAnimationFrameId++
      animationFrameCallbacks.set(id, callback)
      return id
    })
    cancelAnimationFrameMock = vi.fn((id: number): void => {
      animationFrameCallbacks.delete(id)
    })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)

    PlaybackClock.setAudioElement(null)
    PlaybackClock.setMode(true)
    PlaybackClock.setSmtcState(12.5, false)
  })

  afterEach(() => {
    for (const unsubscribe of activeUnsubscribes) unsubscribe()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('registers a subscriber and delivers the playback time', () => {
    const callback = vi.fn()
    subscribe(callback)

    runNextAnimationFrame()

    expect(callback).toHaveBeenCalledWith(12.5)
  })

  it('notifies multiple subscribers with the same single clock read', () => {
    const first = vi.fn()
    const second = vi.fn()
    const getCurrentTimeSpy = vi.spyOn(PlaybackClock, 'getCurrentTime')
    subscribe(first)
    subscribe(second)

    runNextAnimationFrame()

    expect(getCurrentTimeSpy).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledWith(12.5)
    expect(second).toHaveBeenCalledWith(12.5)
  })

  it('removes only the unsubscribed callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribe(first)
    subscribe(second)
    unsubscribeFirst()

    runNextAnimationFrame()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(12.5)
  })

  it('makes unsubscribe idempotent', () => {
    const unsubscribe = subscribe(vi.fn())
    unsubscribe()
    unsubscribe()

    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(animationFrameCallbacks).toHaveLength(0)
  })

  it('stops the shared RAF when the final subscriber unsubscribes', () => {
    const unsubscribeFirst = subscribe(vi.fn())
    const unsubscribeSecond = subscribe(vi.fn())
    unsubscribeFirst()

    expect(cancelAnimationFrameMock).not.toHaveBeenCalled()
    unsubscribeSecond()

    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(animationFrameCallbacks).toHaveLength(0)
  })

  it('restarts the shared RAF for a new subscriber', () => {
    const unsubscribe = subscribe(vi.fn())
    unsubscribe()
    subscribe(vi.fn())

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)
    expect(animationFrameCallbacks).toHaveLength(1)
  })

  it('isolates a throwing subscriber and keeps the shared RAF alive', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const healthySubscriber = vi.fn()
    subscribe(() => {
      throw new Error('Subscriber failure')
    })
    subscribe(healthySubscriber)

    runNextAnimationFrame()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(healthySubscriber).toHaveBeenCalledWith(12.5)
    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2)
    expect(animationFrameCallbacks).toHaveLength(1)
  })

  it('immediately notifies subscribers of a seek while paused', () => {
    const callback = vi.fn()
    subscribe(callback)

    PlaybackClock.setSeekPosition(42)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(42)
  })

  it('does not create duplicate RAF loops for repeated subscriptions', () => {
    subscribe(vi.fn())
    subscribe(vi.fn())
    subscribe(vi.fn())

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1)
    expect(animationFrameCallbacks).toHaveLength(1)
  })
})
