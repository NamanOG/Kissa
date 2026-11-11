import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetadataPanel } from '../MetadataPanel'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('MetadataPanel component', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: null,
      progress: 0,
      listenerName: ''
    })
  })

  it('greets the listener when nothing is playing', () => {
    usePlayerStore.setState({ currentTrack: null, listenerName: 'Naman' })
    render(<MetadataPanel />)
    expect(screen.getByText('The room is quiet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Naman')
    expect(screen.queryByLabelText('Share this track')).not.toBeInTheDocument()
  })

  it('treats the idle placeholder as nothing playing', () => {
    usePlayerStore.setState({
      currentTrack: { title: 'Kissa', artist: 'Listening Room', album: 'Kissa', duration: 0, sourceAppId: 'kissa-idle' }
    })
    render(<MetadataPanel />)
    expect(screen.getByText('The room is quiet')).toBeInTheDocument()
    expect(screen.queryByText('Listening Room')).not.toBeInTheDocument()
  })

  it('shows title, artist, album and where it plays from, without repeating the dock time', () => {
    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        album: 'Random Access Memories',
        duration: 248,
        source: 'Spotify'
      },
      progress: 75
    })

    render(<MetadataPanel />)
    expect(screen.getByText('Get Lucky')).toBeInTheDocument()
    expect(screen.getByText('Daft Punk')).toBeInTheDocument()
    expect(screen.getByText('Random Access Memories')).toBeInTheDocument()
    expect(screen.queryByText('4:08')).not.toBeInTheDocument()
    // One quiet line under the cover says where it plays from.
    expect(screen.getByTestId('np-source')).toHaveTextContent('Playing from Spotify')
  })

  it('says Paused when the track is not playing, and omits an album that repeats the title', () => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: { title: 'Greenhouse', artist: 'Odile', album: 'Greenhouse', duration: 251 }
    })
    render(<MetadataPanel />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getAllByText('Greenhouse')).toHaveLength(1)
  })
})
