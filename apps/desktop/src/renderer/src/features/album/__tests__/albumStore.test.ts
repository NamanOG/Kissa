import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAlbumStore } from '../albumStore'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { externalSession, resetExternalSession } from '@renderer/utils/externalSession'
import type { LocalAlbum } from '../../../../../types/album'

const album: LocalAlbum = {
  title: 'Tone Suite',
  artist: 'Fixture Band',
  coverDataUrl: 'data:image/png;base64,AA==',
  order: 'tags',
  leftOut: [],
  tracks: ['Zulu', 'Mike', 'Alpha'].map((title, i) => ({
    url: `kissa-album://track/1/${i}`,
    title,
    artist: 'Fixture Band',
    disc: 1,
    track: i + 1,
    duration: 30,
    fileName: `${i + 1} ${title}.flac`
  }))
}

describe('albumStore', () => {
  beforeEach(() => {
    resetExternalSession()
    window.electron = {
      chooseAlbumFolder: vi.fn().mockResolvedValue({ status: 'ok', album }),
      albumTrackProblem: vi.fn().mockResolvedValue('damaged'),
      mediaPlayPause: vi.fn().mockResolvedValue(undefined)
    } as never
    useAlbumStore.setState({
      status: 'idle',
      album: null,
      notice: null,
      problems: {},
      resume: null
    })
    usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, progress: 0 })
  })
  afterEach(() => {
    delete (window as Partial<Window>).electron
  })

  it('opens a folder and puts its first track on, with the rest queued in order', async () => {
    await useAlbumStore.getState().open('From your PC')
    const player = usePlayerStore.getState()
    expect(player.currentTrack).toMatchObject({
      title: 'Zulu',
      album: 'Tone Suite',
      source: 'From your PC',
      audioUrl: 'kissa-album://track/1/0'
    })
    expect(player.queue.map((t) => t.title)).toEqual(['Mike', 'Alpha'])
    expect(player.isPlaying).toBe(true)
    expect(window.electron.mediaPlayPause).not.toHaveBeenCalled()
  })

  it('pauses another player that is playing when the album starts', async () => {
    externalSession.key = 'Song|Artist|AppleMusic'
    externalSession.playing = true
    await useAlbumStore.getState().open('From your PC')
    expect(window.electron.mediaPlayPause).toHaveBeenCalledTimes(1)
  })

  it('reports an empty folder and a cancelled pick without touching the deck', async () => {
    vi.mocked(window.electron.chooseAlbumFolder!).mockResolvedValueOnce({
      status: 'empty',
      leftOut: ['a.wma']
    })
    await useAlbumStore.getState().open('x')
    expect(useAlbumStore.getState().notice).toBe('empty')
    vi.mocked(window.electron.chooseAlbumFolder!).mockResolvedValueOnce({ status: 'cancelled' })
    await useAlbumStore.getState().open('x')
    expect(useAlbumStore.getState().status).toBe('idle')
    expect(usePlayerStore.getState().currentTrack).toBeNull()
  })

  it('skips a track that will not play and keeps the reason', async () => {
    await useAlbumStore.getState().open('x')
    await useAlbumStore.getState().trackFailed('kissa-album://track/1/0')
    expect(useAlbumStore.getState().problems['kissa-album://track/1/0']).toBe('damaged')
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Mike')
  })

  it('remembers where the album was and resumes there', async () => {
    await useAlbumStore.getState().open('x')
    useAlbumStore.getState().play(1)
    usePlayerStore.setState({ progress: 42 })
    useAlbumStore.getState().suspend()
    expect(useAlbumStore.getState().resume).toEqual({ index: 1, position: 42 })
    usePlayerStore.setState({
      currentTrack: {
        title: 'Other',
        artist: 'A',
        album: 'B',
        duration: 1,
        sourceAppId: 'Spotify.exe'
      },
      progress: 3
    })
    useAlbumStore.getState().resumeAlbum()
    const player = usePlayerStore.getState()
    expect(player.currentTrack?.title).toBe('Mike')
    expect(player.progress).toBe(42)
    expect(player.queue.map((t) => t.title)).toEqual(['Alpha'])
    expect(useAlbumStore.getState().resume).toBeNull()
  })
})
