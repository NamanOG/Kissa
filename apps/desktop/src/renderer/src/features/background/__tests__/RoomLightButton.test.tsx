import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RoomLightButton } from '../RoomLightButton'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'

describe('Moving light on the dock', () => {
  beforeEach(() => {
    usePlayerStore.setState({ theme: 'quiet-room', ambientMotion: false })
    useFeaturesStore.setState({ soundLight: false, followDaylight: true })
  })

  it('says what the light is doing and opens the Room light card', () => {
    render(<RoomLightButton />)
    const button = screen.getByTestId('room-light-button')
    expect(button.getAttribute('aria-label')).toBe('Room light: Moving light needs Match the album')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Room light' })).toBeInTheDocument()
    // No dead switch: the card offers to turn Match the album on.
    fireEvent.click(screen.getByTestId('room-light-match'))
    expect(usePlayerStore.getState().theme).toBe('adaptive')
    expect(usePlayerStore.getState().ambientMotion).toBe(true)
    expect(button.getAttribute('aria-label')).toBe('Room light: Moving light is on, drifting slowly')
    fireEvent.click(screen.getByRole('switch', { name: 'Light moves with the music' }))
    expect(button.getAttribute('aria-label')).toBe('Room light: Moving light is on, flowing with the music')
  })

  it('closes on Escape and gives focus back to the button', () => {
    render(<RoomLightButton />)
    const button = screen.getByTestId('room-light-button')
    fireEvent.click(button)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})
