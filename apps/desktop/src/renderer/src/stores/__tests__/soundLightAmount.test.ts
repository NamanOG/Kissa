import { afterEach, describe, expect, it, vi } from 'vitest'

describe('How much the light moves (store)', () => {
  afterEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults to Balanced, persists a choice and ignores a bad saved value', async () => {
    let { useFeaturesStore } = await import('../featuresStore')
    expect(useFeaturesStore.getState().soundLightAmount).toBe('balanced')
    useFeaturesStore.getState().setSoundLightAmount('lively')
    expect(localStorage.getItem('kissa_sound_light_amount')).toBe('lively')
    vi.resetModules()
    ;({ useFeaturesStore } = await import('../featuresStore'))
    expect(useFeaturesStore.getState().soundLightAmount).toBe('lively')
    localStorage.setItem('kissa_sound_light_amount', 'wild')
    vi.resetModules()
    ;({ useFeaturesStore } = await import('../featuresStore'))
    expect(useFeaturesStore.getState().soundLightAmount).toBe('balanced')
  })

  it('maps the choices to the renderer amounts', async () => {
    const { SOUND_LIGHT_SCALE } = await import('../featuresStore')
    expect(SOUND_LIGHT_SCALE).toEqual({ gentle: 0.5, balanced: 1, lively: 1.5 })
  })
})
