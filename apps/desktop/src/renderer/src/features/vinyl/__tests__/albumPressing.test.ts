import { describe, expect, it } from 'vitest'
import { planAlbumPressing } from '../albumPressing'
import { rgbToOklab } from '@renderer/features/background/colourField'
import { VINYL_COLORS } from '@renderer/stores/playerStore'

const sw = (rgb: [number, number, number], share: number) => ({ rgb, share, x: 0.5, y: 0.5 })

describe('Match the Album pressing', () => {
  it('is a choice in the picker list, not the default', () => {
    expect(VINYL_COLORS).toContain('album')
    expect(VINYL_COLORS[0]).toBe('black')
  })

  it('two strong colours of different hue make a marble of both', () => {
    const plan = planAlbumPressing([sw([230, 160, 60], 0.4), sw([200, 60, 30], 0.3), sw([20, 20, 20], 0.3)])
    expect(plan.style).toBe('marble')
    expect(plan.b).toBeTruthy()
  })

  it('one strong colour makes a translucent pressing in that colour', () => {
    const plan = planAlbumPressing([sw([60, 120, 200], 0.3), sw([180, 170, 160], 0.7)])
    expect(plan.style).toBe('colour')
    const [, a, b] = rgbToOklab(...([1, 3, 5].map((i) => parseInt(plan.a.slice(i, i + 2), 16)) as [number, number, number]))
    expect(Math.atan2(b, a)).toBeLessThan(-1) // still blue
  })

  it('a black-and-white cover never gets an invented colour', () => {
    expect(['smoke', 'black']).toContain(planAlbumPressing([sw([250, 250, 250], 0.6), sw([30, 30, 30], 0.4)]).style)
    expect(planAlbumPressing([sw([20, 20, 20], 0.8), sw([90, 90, 90], 0.2)]).style).toBe('black')
  })

  it('keeps colours in a range real vinyl has: never white, never neon', () => {
    const plan = planAlbumPressing([sw([255, 0, 255], 0.5), sw([250, 250, 250], 0.5)])
    const L = rgbToOklab(...([1, 3, 5].map((i) => parseInt(plan.a.slice(i, i + 2), 16)) as [number, number, number]))[0]
    expect(L).toBeLessThan(0.6)
    expect(L).toBeGreaterThan(0.35)
  })
})
