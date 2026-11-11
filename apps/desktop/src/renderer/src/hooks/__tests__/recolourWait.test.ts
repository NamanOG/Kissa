import { describe, expect, it } from 'vitest'
import { RECOLOUR_DELAY_MS, recolourWait } from '../useAdaptiveColor'

describe('recolourWait', () => {
  it('holds a new song’s colours until the title and cover crossfade has finished', () => {
    expect(recolourWait(100, false, false)).toBe(RECOLOUR_DELAY_MS - 100)
    expect(RECOLOUR_DELAY_MS).toBe(550)
  })
  it('applies colours that arrive after the crossfade at once', () => {
    expect(recolourWait(800, false, false)).toBe(0)
  })
  it('applies the first colours of a session and every change under reduced motion at once', () => {
    expect(recolourWait(0, true, false)).toBe(0)
    expect(recolourWait(0, false, true)).toBe(0)
  })
})
