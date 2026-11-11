import { describe, expect, it } from 'vitest'
import { toastAccent } from '../useTrackToast'

describe('toastAccent', () => {
  it('uses the new song’s own palette, not the room’s delayed colour', async () => {
    document.documentElement.style.setProperty('--adaptive-accent', 'rgb(1, 2, 3)')
    const accent = await toastAccent('https://x/new.jpg', 'adaptive', () => Promise.resolve({ accent: 'rgb(208, 138, 82)' }))
    expect(accent).toBe('#d08a52')
  })
  it('reads the room palette hsl colours', async () => {
    const accent = await toastAccent('https://x/new.jpg', 'adaptive', () => Promise.resolve({ accent: 'hsl(85.7, 2.4%, 55.0%)' }))
    expect(accent).toBe('#8d8f89')
    expect(await toastAccent('https://x/b.jpg', 'adaptive', () => Promise.resolve({ accent: 'hsl(315.2, 88.3%, 55.0%)' }))).toBe('#f227be')
  })
  it('has no accent outside the album-matched room or without a cover', async () => {
    const extract = (): Promise<{ accent: string }> => Promise.resolve({ accent: '#ffffff' })
    expect(await toastAccent('https://x/a.jpg', 'jazz-bar', extract)).toBeUndefined()
    expect(await toastAccent(undefined, 'adaptive', extract)).toBeUndefined()
  })
  it('leaves the accent out when the palette is slow or fails', async () => {
    expect(await toastAccent('https://x/a.jpg', 'adaptive', () => new Promise(() => {}), 10)).toBeUndefined()
    expect(await toastAccent('https://x/a.jpg', 'adaptive', () => Promise.reject(new Error('no')))).toBeUndefined()
  })
})
