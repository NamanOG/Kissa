import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { VinylSoundButton } from '../VinylSoundButton'
import { useHifiStore } from '../hifiStore'
import { usePlayerStore } from '@renderer/stores/playerStore'

const albumTrack = {
  title: 'So What',
  artist: 'Test Quintet',
  album: 'Fixture',
  artworkUrl: '',
  audioUrl: 'kissa-album://track/1/0',
  duration: 6
}

describe('Vinyl sound beside the record', () => {
  beforeEach(() => {
    useHifiStore.setState({ on: true, wear: 'played', comparing: false, status: 'idle' })
    usePlayerStore.setState({ currentTrack: albumTrack })
  })

  it('only shows while an album from the PC is on the deck', () => {
    usePlayerStore.setState({ currentTrack: { ...albumTrack, audioUrl: undefined } })
    const { container } = render(<VinylSoundButton />)
    expect(container.innerHTML).toBe('')
  })

  it('says its state, switches, picks the wear and compares while held', () => {
    render(<VinylSoundButton />)
    const button = screen.getByTestId('vinyl-sound-button')
    expect(button.getAttribute('aria-label')).toBe('Vinyl sound: On: Played')
    fireEvent.click(button)
    expect(screen.getByRole('dialog', { name: 'Vinyl sound' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Well loved' }))
    expect(useHifiStore.getState().wear).toBe('loved')
    expect(button.getAttribute('aria-label')).toBe('Vinyl sound: On: Well loved')

    const compare = screen.getByTestId('vinyl-compare')
    fireEvent.keyDown(compare, { key: ' ' })
    expect(useHifiStore.getState().comparing).toBe(true)
    fireEvent.keyUp(compare, { key: ' ' })
    expect(useHifiStore.getState().comparing).toBe(false)

    fireEvent.click(screen.getByRole('switch', { name: 'Play it like a record' }))
    expect(useHifiStore.getState().on).toBe(false)
    expect(button.getAttribute('aria-label')).toBe('Vinyl sound: Off: the file as it is')
    expect(localStorage.getItem('kissa_vinyl_sound')).toBe('false')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})
