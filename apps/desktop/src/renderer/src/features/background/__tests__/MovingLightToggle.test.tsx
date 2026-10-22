import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { MovingLightToggle } from '../MovingLightToggle'

describe('Moving light quick toggle', () => {
  afterEach(() => {
    usePlayerStore.setState({ ambientMotion: false, theme: 'quiet-room' })
    localStorage.removeItem('kissa_ambient_motion')
  })

  it('is off by default and turns the shared preference on and off', () => {
    usePlayerStore.setState({ theme: 'adaptive', ambientMotion: false })
    render(<MovingLightToggle variant="dock" />)
    const button = screen.getByRole('button', { name: /Moving light: off/ })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(usePlayerStore.getState().ambientMotion).toBe(true)
    expect(localStorage.getItem('kissa_ambient_motion')).toBe('true')
    expect(screen.getByRole('button', { name: /Moving light: on/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('the dock and full-screen buttons always agree', () => {
    usePlayerStore.setState({ theme: 'adaptive', ambientMotion: false })
    render(
      <>
        <MovingLightToggle variant="dock" />
        <MovingLightToggle variant="fullscreen" />
      </>
    )
    fireEvent.click(screen.getAllByRole('button')[1])
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-pressed')).toBe('true')
    act(() => usePlayerStore.getState().setAmbientMotion(false))
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-pressed')).toBe('false')
  })

  it('under a manual room it explains why it is unavailable and changes nothing', () => {
    usePlayerStore.setState({ theme: 'quiet-room', ambientMotion: false })
    render(<MovingLightToggle variant="fullscreen" />)
    const button = screen.getByRole('button', { name: 'Moving light works with Match the album' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(button)
    expect(usePlayerStore.getState().ambientMotion).toBe(false)
  })
})
