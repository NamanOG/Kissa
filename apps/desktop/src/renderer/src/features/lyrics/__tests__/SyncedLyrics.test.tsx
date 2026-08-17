import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyncedLyrics, parseLrc } from '../SyncedLyrics'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('SyncedLyrics Component & Parser', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Self Control',
        artist: 'Frank Ocean',
        album: 'Blonde',
        duration: 249
      },
      progress: 5
    })
  })

  it('parses LRC timestamped format correctly', () => {
    const lrc = `
      [00:03.50] Pool side convo
      [00:08.50] About your summer last night
    `
    const parsed = parseLrc(lrc)
    expect(parsed.length).toBe(2)
    expect(parsed[0].time).toBeCloseTo(3.5)
    expect(parsed[0].text).toBe('Pool side convo')
    expect(parsed[1].time).toBeCloseTo(8.5)
    expect(parsed[1].text).toBe('About your summer last night')
  })

  it('renders default track synced lyrics', () => {
    render(<SyncedLyrics />)
    expect(screen.getByText(/Pool side convo/i)).toBeInTheDocument()
    expect(screen.getByText('Ooh yeah, about your summer last night')).toBeInTheDocument()
  })

  it('seeks to line timestamp when clicked', () => {
    render(<SyncedLyrics />)
    const lineEl = screen.getByText('Ooh yeah, about your summer last night')
    fireEvent.click(lineEl)

    expect(usePlayerStore.getState().progress).toBeCloseTo(8.5)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })
})
