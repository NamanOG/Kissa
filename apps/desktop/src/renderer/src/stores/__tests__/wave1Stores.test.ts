import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSavedLinesStore } from '../savedLinesStore'
import { tickSleep, useSleepStore } from '../sleepStore'
import { usePlayerStore } from '../playerStore'
import { compareTones, toneFromPixels } from '../../features/shelf/coverTone'

describe('saved lines', () => {
  beforeEach(() => useSavedLinesStore.setState({ lines: [] }))
  it('keeps a line once and lets it go on the second press', () => {
    const line = { text: ' So what ', title: 'So What', artist: 'Miles Davis', album: 'Kind of Blue' }
    expect(useSavedLinesStore.getState().toggle(line)).toBe(true)
    expect(useSavedLinesStore.getState().lines[0].text).toBe('So what')
    expect(useSavedLinesStore.getState().toggle(line)).toBe(false)
    expect(useSavedLinesStore.getState().lines).toHaveLength(0)
  })
})

describe('sleep timer', () => {
  it('stops the music when the time is up, not before', () => {
    usePlayerStore.setState({ isPlaying: true })
    useSleepStore.getState().start(1)
    const endsAt = useSleepStore.getState().endsAt!
    expect(tickSleep(endsAt - 1000)).toBe(false)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
    window.electron = { ...(window.electron ?? {}), mediaPlayPause: vi.fn() } as never
    expect(tickSleep(endsAt)).toBe(true)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(useSleepStore.getState().endsAt).toBeNull()
  })
})

describe('cover colour', () => {
  const solid = (r: number, g: number, b: number): Uint8ClampedArray => {
    const d = new Uint8ClampedArray(16 * 4)
    for (let i = 0; i < 16; i++) d.set([r, g, b, 255], i * 4)
    return d
  }
  it('reads a red sleeve as red and a grey one as grey', () => {
    const red = toneFromPixels(solid(200, 30, 30))
    const grey = toneFromPixels(solid(120, 120, 120))
    expect(red[0]).toBeLessThan(10)
    expect(red[1]).toBeGreaterThan(0.5)
    expect(grey[1]).toBe(0)
  })
  it('puts colours round the wheel and greys last', () => {
    const red = toneFromPixels(solid(200, 30, 30))
    const blue = toneFromPixels(solid(30, 60, 200))
    const grey = toneFromPixels(solid(120, 120, 120))
    const sorted = [grey, blue, red].sort(compareTones)
    expect(sorted).toEqual([red, blue, grey])
  })
})
