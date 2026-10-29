import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomDimmer } from '../RoomDimmer'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('RoomDimmer from the keyboard', () => {
  beforeEach(() => {
    usePlayerStore.setState({ illuminationLevel: 50 })
  })

  it('is a focusable slider that reads its level and moves with the keys', () => {
    render(<RoomDimmer />)
    const slider = screen.getByRole('slider', { name: 'Room light' })
    expect(slider).toHaveAttribute('tabindex', '0')
    expect(slider).toHaveAttribute('aria-valuetext', '50 percent')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(usePlayerStore.getState().illuminationLevel).toBe(55)
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(usePlayerStore.getState().illuminationLevel).toBe(0)
    expect(slider).toHaveAttribute('aria-valuetext', '0 percent')
  })
})
