import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MetadataPanel } from '@renderer/features/now-playing/MetadataPanel'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { useAlbumStore } from '../albumStore'
import type { LocalAlbum } from '../../../../../types/album'

const album: LocalAlbum = {
  title: 'Tone Suite',
  artist: 'Fixture Band',
  coverDataUrl: '',
  order: 'filenames',
  leftOut: ['bonus.wma'],
  tracks: ['Zulu', 'Mike', 'Alpha'].map((title, i) => ({
    url: `kissa-album://track/1/${i}`,
    title,
    artist: 'Fixture Band',
    disc: 0,
    track: 0,
    duration: 65,
    fileName: `${i + 1} ${title}.mp3`
  }))
}

describe('an album from the PC on the back of the sleeve', () => {
  beforeEach(() => {
    useSidesStore.setState({ sides: null, place: null, sleeveTurned: false, lookup: 'missing' })
    useAlbumStore.setState({ album, problems: { 'kissa-album://track/1/2': 'unsupported' }, resume: null, sourceLabel: 'From your PC' })
    usePlayerStore.setState({
      isPlaying: true,
      queue: [],
      currentTrack: { title: 'Zulu', artist: 'Fixture Band', album: 'Tone Suite', duration: 65, audioUrl: 'kissa-album://track/1/0', source: 'From your PC' }
    })
  })

  it('lists the files as buttons, says why one will not play, and plays another on a click', () => {
    render(<MetadataPanel />)
    const button = screen.getByTestId('tracklist-button')
    expect(button.textContent).toContain('Track list')
    fireEvent.click(button)
    expect(screen.getByTestId('side-source').textContent).toBe('From your PC')
    expect(screen.getByTestId('album-order').textContent).toContain('file-name order')
    expect(screen.getByTestId('album-order').textContent).toContain('bonus.wma')
    const alpha = screen.getByRole('button', { name: /Alpha\. Cannot play/ })
    expect(alpha).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Play Mike' }))
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Mike')
    // A file already known not to play is not queued.
    expect(usePlayerStore.getState().queue).toHaveLength(0)
    expect(useSidesStore.getState().sleeveTurned).toBe(true)
  })
})
