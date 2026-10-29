import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useAlbumStore } from '@renderer/features/album/albumStore'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { useLanguageStore } from '@renderer/i18n'
import { queueSnapshot, playQueueIndex } from '../queueSnapshot'
import { usePhoneRemote, runRemoteCommand } from '../usePhoneRemote'
import { REMOTE_OFF, useRemoteStore } from '../remoteStore'
import { UpNextButton } from '../UpNext'
import type { LocalAlbum } from '../../../../../types/album'

const album: LocalAlbum = {
  title: 'Evening rooms',
  artist: 'Test artist',
  coverDataUrl: '',
  order: 'tags',
  leftOut: [],
  tracks: ['First room', 'Second room', 'Last room'].map((title, i) => ({
    title,
    artist: 'Test artist',
    duration: 120 + i,
    disc: 1,
    track: i + 1,
    fileName: `${i}.flac`,
    url: `kissa-album://test/${i}`
  }))
}
beforeEach(() => {
  useAlbumStore.setState({ album, problems: {}, resume: null })
  usePlayerStore.setState({ currentTrack: null, queue: [], progress: 0, isPlaying: false })
  useSidesStore.setState({ sides: null, albumKey: null, lookup: 'missing', sleeveTurned: false })
  useLanguageStore.setState({ language: 'en' })
  useRemoteStore.setState({ status: REMOTE_OFF })
})

describe('truthful play order', () => {
  it('keeps album order, marks the current file and refuses failed files', () => {
    useAlbumStore.setState({ problems: { [album.tracks[2].url]: 'damaged' } })
    useAlbumStore.getState().play(1)
    const queue = queueSnapshot()
    expect(queue.kind).toBe('album')
    expect(queue.rows.map((r) => r.title)).toEqual(album.tracks.map((r) => r.title))
    expect(queue.rows[1].current).toBe(true)
    expect(playQueueIndex(2, queue.revision)).toBe(false)
    expect(playQueueIndex(0, queue.revision)).toBe(true)
    expect(usePlayerStore.getState().currentTrack?.title).toBe('First room')
    expect(usePlayerStore.getState().queue.map((r) => r.title)).toEqual(['Second room'])
  })
  it('uses the real internal queue and rejects stale indices after it changes', () => {
    const track = (title: string) => ({
      title,
      artist: 'Artist',
      album: 'Album',
      duration: 10,
      audioUrl: `https://example.test/${title}.mp3`
    })
    usePlayerStore.setState({ currentTrack: track('A'), queue: [track('C'), track('B')] })
    const old = queueSnapshot()
    expect(old.rows.map((r) => r.title)).toEqual(['A', 'C', 'B'])
    usePlayerStore.getState().reorderQueue([track('B'), track('C')])
    expect(playQueueIndex(1, old.revision)).toBe(false)
    const next = queueSnapshot()
    runRemoteCommand({ action: 'playIndex', index: 2, revision: next.revision })
    expect(usePlayerStore.getState().currentTrack?.title).toBe('C')
    expect(usePlayerStore.getState().queue).toEqual([])
  })
  it('shows a reordered PC queue as its actual play order, not the original album order', () => {
    useAlbumStore.getState().play(0)
    const before = queueSnapshot()
    usePlayerStore.getState().reorderQueue([...usePlayerStore.getState().queue].reverse())
    const queue = queueSnapshot()
    expect(queue.kind).toBe('queue')
    expect(queue.rows.map((row) => row.title)).toEqual(['First room', 'Last room', 'Second room'])
    expect(playQueueIndex(1, before.revision)).toBe(false)
    expect(playQueueIndex(1, queue.revision)).toBe(true)
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Last room')
  })
  it('never exposes a retained PC queue while streaming, even during lookup', () => {
    useAlbumStore.getState().play(0)
    const before = queueSnapshot()
    usePlayerStore.setState({
      currentTrack: {
        title: 'Stream',
        artist: 'Singer',
        album: 'Online',
        duration: 150,
        sourceAppId: 'Spotify.exe'
      }
    })
    expect(queueSnapshot()).toMatchObject({ kind: 'album-info', rows: [] })
    expect(playQueueIndex(1, before.revision)).toBe(false)
    useSidesStore.setState({
      albumKey: 'singer|online',
      lookup: 'found',
      sides: {
        kind: 'split',
        sides: [{ letter: 'A', tracks: [{ title: 'Stream', length: 150000 }] }]
      }
    })
    const info = queueSnapshot()
    expect(info.rows[0]).toMatchObject({ current: true, playable: false, duration: 150 })
    expect(playQueueIndex(0, info.revision)).toBe(false)
  })
  it('bounds long albums while retaining the current row, without paths in the payload', () => {
    useAlbumStore.setState({
      album: {
        ...album,
        tracks: Array.from({ length: 500 }, (_, i) => ({
          ...album.tracks[0],
          title: 'x'.repeat(300),
          url: `kissa-album://test/${i}`
        }))
      }
    })
    useAlbumStore.getState().play(250)
    const queue = queueSnapshot()
    expect(queue.rows).toHaveLength(200)
    expect(queue.rows.find((row) => row.current)?.index).toBe(250)
    expect(queue.rows[0].title).toHaveLength(200)
    expect(JSON.stringify(queue)).not.toContain('kissa-album:')
    for (const index of [-1, 0.5, NaN, Infinity, 900])
      expect(playQueueIndex(index, queue.revision)).toBe(false)
  })
  it('does not rebuild or send queue snapshots on clock updates, or with no phones', () => {
    useAlbumStore.getState().play(0)
    const sendRemoteQueue = vi.fn()
    window.electron = { sendRemoteQueue, sendRemoteNowPlaying: vi.fn() } as never
    const { unmount } = renderHook(usePhoneRemote)
    act(() => usePlayerStore.setState({ progress: 2 }))
    expect(sendRemoteQueue).not.toHaveBeenCalled()
    act(() => useRemoteStore.setState({ status: { ...REMOTE_OFF, on: true, phones: 1 } }))
    expect(sendRemoteQueue).toHaveBeenCalledTimes(1)
    const before = queueSnapshot()
    act(() => usePlayerStore.setState({ progress: 3, isPlaying: false }))
    expect(queueSnapshot()).toBe(before)
    expect(sendRemoteQueue).toHaveBeenCalledTimes(1)
    act(() => useAlbumStore.getState().play(1))
    expect(sendRemoteQueue).toHaveBeenCalledTimes(2)
    unmount()
    delete (window as Partial<Window>).electron
  })
})

describe('desktop Up next', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  })
  it('opens from a named entry, plays a real track and returns focus on Escape', () => {
    useAlbumStore.getState().play(0)
    render(<UpNextButton />)
    const opener = screen.getByRole('button', { name: 'Up next' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog', { name: 'Up next' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Second room' }))
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Second room')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
  it('shows no Up next for a streaming app (its queue cannot be read)', () => {
    usePlayerStore.setState({
      currentTrack: {
        title: 'Stream',
        artist: 'Singer',
        album: 'Online',
        duration: 10,
        sourceAppId: 'AppleMusic.exe'
      }
    })
    useSidesStore.setState({
      albumKey: 'singer|online',
      lookup: 'found',
      sides: {
        kind: 'vinyl',
        sides: [{ letter: 'A', tracks: [{ title: 'Stream', length: 10000 }] }]
      }
    })
    render(<UpNextButton />)
    expect(screen.queryByTestId('up-next-button')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Play Stream' })).toBeNull()
  })
  it('localizes the new entry and explanation into Spanish', () => {
    useLanguageStore.setState({ language: 'es' })
    useAlbumStore.getState().play(0)
    render(<UpNextButton />)
    fireEvent.click(screen.getByRole('button', { name: 'A continuación' }))
    expect(screen.getByText(/Orden del álbum de tu PC/)).toBeInTheDocument()
  })
})
