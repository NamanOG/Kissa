import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VinylEngine } from '../VinylEngine'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('VinylEngine component', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Instant Crush',
        artist: 'Daft Punk',
        album: 'RAM',
        artworkUrl: 'https://example.com/art.png',
        duration: 300
      },
      progress: 0
    })
  })

  it('renders vinyl record layers and spindle', () => {
    render(<VinylEngine />)
    const albumArt = screen.getByAltText('Album Art')
    expect(albumArt).toBeInTheDocument()
    expect(albumArt).toHaveAttribute('src', 'https://example.com/art.png')
  })

  it('overrides store albumArt when prop is provided', () => {
    render(<VinylEngine albumArt="https://example.com/custom.png" />)
    const albumArt = screen.getByAltText('Album Art')
    expect(albumArt).toHaveAttribute('src', 'https://example.com/custom.png')
  })
})
