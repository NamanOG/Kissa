import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TooltipLayer } from '../TooltipLayer'
import { splitShortcut, shortcutKeys } from '../tooltipText'

describe('splitShortcut', () => {
  it('splits a trailing key into a keycap', () => {
    expect(splitShortcut('Change your turntable (E)')).toEqual({ label: 'Change your turntable', shortcut: 'E' })
    expect(splitShortcut('Desktop lyrics (Ctrl+Alt+L)')).toEqual({ label: 'Desktop lyrics', shortcut: 'Ctrl+Alt+L' })
    expect(shortcutKeys('Ctrl+Alt+L')).toEqual(['Ctrl', 'Alt', 'L'])
  })

  it('keeps a parenthesis that is not a key', () => {
    expect(splitShortcut('Party mode (for a TV)')).toEqual({ label: 'Party mode (for a TV)' })
    expect(splitShortcut('Lyrics')).toEqual({ label: 'Lyrics' })
  })
})

describe('TooltipLayer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (): HTMLElement => {
    render(
      <>
        <button type="button" title="Change your turntable (E)">
          Kissa
        </button>
        <TooltipLayer />
      </>
    )
    return screen.getByRole('button', { name: 'Kissa' })
  }

  it('takes over the title so the stock tooltip never shows', () => {
    const button = setup()
    expect(button).not.toHaveAttribute('title')
    expect(button).toHaveAttribute('data-kissa-tip', 'Change your turntable (E)')
    expect(button).toHaveAttribute('aria-keyshortcuts', 'E')
  })

  it('opens after a short hover with the shortcut as a keycap, described for screen readers', () => {
    const button = setup()
    fireEvent.pointerOver(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(() => vi.advanceTimersByTime(500))
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Change your turntable')
    expect(tip.querySelector('kbd')).toHaveTextContent('E')
    expect(button).toHaveAttribute('aria-describedby', tip.id)
  })

  it('closes on Escape and on a press', () => {
    const button = setup()
    fireEvent.pointerOver(button)
    act(() => vi.advanceTimersByTime(500))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(button).not.toHaveAttribute('aria-describedby')

    fireEvent.pointerOver(document.body)
    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerOver(button)
    act(() => vi.advanceTimersByTime(500))
    fireEvent.pointerDown(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('names an icon-only control by its tooltip', () => {
    render(
      <>
        <button type="button" title="Close the dust lid" />
        <TooltipLayer />
      </>
    )
    expect(screen.getByRole('button', { name: 'Close the dust lid' })).toBeInTheDocument()
  })
})
