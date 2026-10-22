import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { APP_THEMES, VINYL_COLORS, usePlayerStore } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { EDITIONS_KEY, MAX_EDITIONS, sanitizeEditions } from '../editions'
import { VinylBase } from '@renderer/features/vinyl/VinylBase'
import { TurntableBase } from '@renderer/features/turntable/TurntableBase'

const valid = { pressings: VINYL_COLORS, themes: APP_THEMES }

describe('sanitizeEditions', () => {
  it('keeps well-formed setups and drops anything it cannot trust', () => {
    const raw = [
      { id: 'a', name: '  Late   night ', finish: 'porcelain', pressing: 'marble', theme: 'jazz-bar' },
      { id: 'b', name: 'Bad finish', finish: 'gold', pressing: 'black', theme: 'jazz-bar' },
      { id: 'c', name: 'Bad pressing', finish: 'silver', pressing: 'glitter', theme: 'jazz-bar' },
      { id: 'd', name: 'Bad room', finish: 'silver', pressing: 'black', theme: 'moon' },
      { id: 'a', name: 'Duplicate id', finish: 'silver', pressing: 'black', theme: 'adaptive' },
      { id: 'e', name: '   ', finish: 'silver', pressing: 'black', theme: 'adaptive' },
      null,
      'nonsense'
    ]
    expect(sanitizeEditions(raw, valid)).toEqual([
      { id: 'a', name: 'Late night', finish: 'porcelain', pressing: 'marble', theme: 'jazz-bar' }
    ])
  })

  it('survives non-array input and caps the number kept', () => {
    expect(sanitizeEditions({ not: 'a list' }, valid)).toEqual([])
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `id${i}`, name: `E${i}`, finish: 'original', pressing: 'black', theme: 'adaptive' }))
    expect(sanitizeEditions(many, valid)).toHaveLength(MAX_EDITIONS)
  })
})

describe('editions store', () => {
  beforeEach(() => {
    localStorage.clear()
    useEditionsStore.setState({ finish: 'original', editions: [], isEditorOpen: false, openedWith: null })
    usePlayerStore.setState({ vinylColor: 'black', theme: 'quiet-room', volume: 64, rpm: '33', isPlaying: true })
  })

  it('saves the current look under a name and applies it later', () => {
    const editions = useEditionsStore.getState()
    editions.setFinish('silver')
    usePlayerStore.getState().setVinylColor('split')
    usePlayerStore.getState().setTheme('midnight-apartment')
    const saved = editions.saveEdition('Studio nights')
    expect(saved).toMatchObject({ name: 'Studio nights', finish: 'silver', pressing: 'split', theme: 'midnight-apartment' })
    expect(JSON.parse(localStorage.getItem(EDITIONS_KEY)!)).toHaveLength(1)

    editions.resetToOriginal()
    usePlayerStore.getState().setTheme('sunday-morning')
    useEditionsStore.getState().applyEdition(saved!.id)
    expect(useEditionsStore.getState().finish).toBe('silver')
    expect(usePlayerStore.getState()).toMatchObject({ vinylColor: 'split', theme: 'midnight-apartment' })
  })

  it('never touches playback, volume or speed', () => {
    const editions = useEditionsStore.getState()
    editions.setFinish('porcelain')
    const saved = editions.saveEdition('Quiet')!
    editions.resetToOriginal()
    editions.applyEdition(saved.id)
    expect(usePlayerStore.getState()).toMatchObject({ volume: 64, rpm: '33', isPlaying: true })
  })

  it('updates a same-named setup in place instead of duplicating it', () => {
    const editions = useEditionsStore.getState()
    editions.saveEdition('Mine')
    editions.setFinish('porcelain')
    useEditionsStore.getState().saveEdition('  mine ')
    expect(useEditionsStore.getState().editions).toHaveLength(1)
    expect(useEditionsStore.getState().editions[0].finish).toBe('porcelain')
  })

  it('Cancel puts back the look from when the editor opened; Done keeps changes', () => {
    const editions = useEditionsStore.getState()
    editions.openEditor()
    editions.setFinish('silver')
    usePlayerStore.getState().setVinylColor('marble')
    usePlayerStore.getState().setTheme('jazz-bar')
    useEditionsStore.getState().cancelEditor()
    expect(useEditionsStore.getState()).toMatchObject({ finish: 'original', isEditorOpen: false })
    expect(usePlayerStore.getState()).toMatchObject({ vinylColor: 'black', theme: 'quiet-room' })

    useEditionsStore.getState().openEditor()
    useEditionsStore.getState().setFinish('porcelain')
    useEditionsStore.getState().closeEditor()
    expect(useEditionsStore.getState().finish).toBe('porcelain')
    expect(localStorage.getItem('kissa_deck_finish')).toBe('porcelain')
  })

  it('Original resets finish and pressing but leaves the room', () => {
    useEditionsStore.getState().setFinish('silver')
    usePlayerStore.getState().setVinylColor('marble')
    useEditionsStore.getState().resetToOriginal()
    expect(useEditionsStore.getState().finish).toBe('original')
    expect(usePlayerStore.getState()).toMatchObject({ vinylColor: 'black', theme: 'quiet-room' })
  })

  it('ignores an unknown finish', () => {
    useEditionsStore.getState().setFinish('gold' as never)
    expect(useEditionsStore.getState().finish).toBe('original')
  })
})

describe('finish and pressing on the deck', () => {
  it('draws the special pressings with their own shapes', () => {
    usePlayerStore.setState({ vinylColor: 'marble' })
    const { container, rerender } = render(<VinylBase />)
    expect(container.querySelector('[data-pressing="marble"]')).not.toBeNull()
    usePlayerStore.setState({ vinylColor: 'split' })
    rerender(<VinylBase />)
    expect(container.querySelector('[data-pressing="split"]')).not.toBeNull()
    usePlayerStore.setState({ vinylColor: 'black' })
    rerender(<VinylBase />)
    expect(container.querySelector('[data-pressing]')).toBeNull()
  })

  it('gives each record its own gradient ids', () => {
    usePlayerStore.setState({ vinylColor: 'cobalt' })
    const { container } = render(
      <>
        <VinylBase />
        <VinylBase />
      </>
    )
    const ids = [...container.querySelectorAll('radialGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('colours the plinth and its engraved labels by finish', () => {
    useEditionsStore.setState({ finish: 'porcelain' })
    const { container } = render(<TurntableBase />)
    const base = container.firstElementChild as HTMLElement
    expect(base.dataset.finish).toBe('porcelain')
    expect(base.style.getPropertyValue('--deck-engrave')).toBe('#5a5146')
    expect(container.querySelector('linearGradient stop')?.getAttribute('stop-color')).toBe('#ddd3c1')
    expect(container.querySelector('[data-finish-sheen]')).not.toBeNull()
    useEditionsStore.setState({ finish: 'silver' })
    const silver = render(<TurntableBase />)
    expect(silver.container.querySelector('[data-texture="brushed"] image')).not.toBeNull()
  })
})
