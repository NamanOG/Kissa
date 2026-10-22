import { afterEach, describe, expect, it, vi } from 'vitest'

// One preference for every turntable sound, kept across restarts.
async function freshStore(): Promise<typeof import('../playerStore').usePlayerStore> {
  vi.resetModules()
  return (await import('../playerStore')).usePlayerStore
}

afterEach(() => localStorage.clear())

describe('Turntable sounds preference', () => {
  it('is on by default', async () => {
    expect((await freshStore()).getState().needleSound).toBe(true)
  })

  it('is remembered after a restart when turned off', async () => {
    ;(await freshStore()).getState().setNeedleSound(false)
    expect(localStorage.getItem('kissa_turntable_sounds')).toBe('false')
    expect((await freshStore()).getState().needleSound).toBe(false)
  })

  it('someone who had turned Physical feedback off keeps the needle quiet after updating', async () => {
    localStorage.setItem('kissa_physical_feedback', 'false')
    expect((await freshStore()).getState().needleSound).toBe(false)
  })

  it('an explicit choice wins over the older setting', async () => {
    localStorage.setItem('kissa_physical_feedback', 'false')
    localStorage.setItem('kissa_turntable_sounds', 'true')
    expect((await freshStore()).getState().needleSound).toBe(true)
  })
})
