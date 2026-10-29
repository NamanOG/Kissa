import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlDock } from '../ControlDock'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('ControlDock from the keyboard', () => {
  const seek = vi.fn()

  beforeEach(() => {
    seek.mockReset()
    usePlayerStore.setState({
      isPlaying: false,
      showSideLyrics: false,
      isFullscreen: false,
      currentTrack: { title: 'Instant Crush', artist: 'Daft Punk', album: 'RAM', duration: 337 },
      seek
    })
  })

  it('moves the track position with the arrow, Page, Home and End keys', () => {
    render(<ControlDock />)
    const bar = screen.getByRole('slider', { name: 'Track position' })
    expect(bar).toHaveAttribute('tabindex', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '337')
    expect(bar).toHaveAttribute('aria-valuetext', '0:00 of 5:37')

    fireEvent.keyDown(bar, { key: 'ArrowRight' })
    expect(seek).toHaveBeenLastCalledWith(5)
    fireEvent.keyDown(bar, { key: 'ArrowRight' })
    expect(seek).toHaveBeenLastCalledWith(10)
    fireEvent.keyDown(bar, { key: 'PageUp' })
    expect(seek).toHaveBeenLastCalledWith(40)
    expect(bar).toHaveAttribute('aria-valuetext', '0:40 of 5:37')
    fireEvent.keyDown(bar, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenLastCalledWith(35)
    fireEvent.keyDown(bar, { key: 'End' })
    expect(seek).toHaveBeenLastCalledWith(336)
    fireEvent.keyDown(bar, { key: 'Home' })
    expect(seek).toHaveBeenLastCalledWith(0)
    fireEvent.keyDown(bar, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenLastCalledWith(0)
  })

  it('keeps the position bar out of the Tab order when the source cannot seek', () => {
    usePlayerStore.setState({
      currentTrack: { title: 'Live', artist: 'Radio', album: '', duration: 0 }
    })
    render(<ControlDock />)
    const bar = screen.getByRole('slider', { name: 'Track position' })
    expect(bar).toHaveAttribute('tabindex', '-1')
    expect(bar).toHaveAttribute('aria-disabled', 'true')
    fireEvent.keyDown(bar, { key: 'ArrowRight' })
    expect(seek).not.toHaveBeenCalled()
  })

  it('gives every dock button a visible focus ring', () => {
    render(<ControlDock />)
    for (const name of ['Previous track', 'Play', 'Next track', 'Lyrics on or off', 'Fullscreen']) {
      expect(screen.getByRole('button', { name })).toHaveClass('focus-visible:outline-2')
    }
  })

  it('says whether lyrics and fullscreen are on', () => {
    usePlayerStore.setState({ showSideLyrics: true })
    render(<ControlDock />)
    expect(screen.getByRole('button', { name: 'Lyrics on or off' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('takes the switched-off dock out of the Tab order when nothing is playing', () => {
    usePlayerStore.setState({ currentTrack: null })
    const { container } = render(<ControlDock />)
    expect(container.firstChild as HTMLElement).toHaveAttribute('inert')
  })
})
