import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetadataPanel } from '../MetadataPanel'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('MetadataPanel component', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: null,
      progress: 0
    })
  })

  it('renders waiting state when no track is active', () => {
    render(<MetadataPanel />)
    expect(screen.getByText('WAITING FOR MUSIC')).toBeInTheDocument()
    expect(screen.getByText('Kissa')).toBeInTheDocument()
  })

  it('renders track title, artist, album, and formatted elapsed/duration time when track is loaded', () => {
    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        album: 'Random Access Memories',
        duration: 248
      },
      progress: 75
    })

    render(<MetadataPanel />)
    expect(screen.getByText('NOW PLAYING')).toBeInTheDocument()
    expect(screen.getByText('Get Lucky')).toBeInTheDocument()
    expect(screen.getByText('Daft Punk')).toBeInTheDocument()
    expect(screen.getByText('Random Access Memories')).toBeInTheDocument()
    expect(screen.getByText('1:15')).toBeInTheDocument()
    expect(screen.getByText('4:08')).toBeInTheDocument()
  })
})
