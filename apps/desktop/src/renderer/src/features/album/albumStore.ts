import { create } from 'zustand'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { usePlayerStore, type TrackInfo } from '@renderer/stores/playerStore'
import { externalSession } from '@renderer/utils/externalSession'
import type {
  LocalAlbum,
  LocalAlbumResult,
  LocalAlbumTrack,
  TrackProblem
} from '../../../../types/album'

export const ALBUM_URL_PREFIX = 'kissa-album://'

export function isAlbumUrl(url: string | undefined | null): url is string {
  return typeof url === 'string' && url.startsWith(ALBUM_URL_PREFIX)
}

export type AlbumNotice = null | 'empty' | 'error'

interface AlbumState {
  /** 'reading' while Windows reads the folder's file properties. */
  status: 'idle' | 'reading'
  album: LocalAlbum | null
  notice: AlbumNotice
  /** Tracks that would not play, by address, and why. */
  problems: Record<string, TrackProblem>
  /** Where the album was when another player took over, for Resume album. */
  resume: { index: number; position: number } | null
  /** Label for where the music comes from, set by the caller in the listener's language. */
  sourceLabel: string

  open: (sourceLabel: string) => Promise<void>
  play: (index: number, position?: number) => void
  resumeAlbum: () => void
  suspend: () => void
  trackFailed: (url: string) => Promise<void>
  dismissNotice: () => void
}

function toTrack(album: LocalAlbum, track: LocalAlbumTrack, source: string): TrackInfo {
  return {
    title: track.title,
    artist: track.artist || album.artist,
    album: album.title,
    artworkUrl: album.coverDataUrl || albumPlaceholder,
    audioUrl: track.url,
    duration: track.duration,
    source,
    canSeek: true
  }
}

/** The index of the album track playing now, or -1 when the record is not from the album. */
export function albumIndexOf(album: LocalAlbum | null, url: string | undefined): number {
  if (!album || !isAlbumUrl(url)) return -1
  return album.tracks.findIndex((t) => t.url === url)
}

export const useAlbumStore = create<AlbumState>((set, get) => ({
  status: 'idle',
  album: null,
  notice: null,
  problems: {},
  resume: null,
  sourceLabel: '',

  open: async (sourceLabel) => {
    if (get().status === 'reading' || !window.electron?.chooseAlbumFolder) return
    set({ status: 'reading', notice: null })
    let result: LocalAlbumResult
    try {
      result = await window.electron.chooseAlbumFolder()
    } catch {
      result = { status: 'error' }
    }
    if (result.status === 'cancelled') return set({ status: 'idle' })
    if (result.status !== 'ok') {
      return set({ status: 'idle', notice: result.status === 'empty' ? 'empty' : 'error' })
    }
    set({ status: 'idle', album: result.album, problems: {}, resume: null, sourceLabel })
    get().play(0)
  },

  play: (index, position = 0) => {
    const { album, problems, sourceLabel } = get()
    const track = album?.tracks[index]
    if (!album || !track) return
    const queue = album.tracks
      .slice(index + 1)
      .filter((t) => !problems[t.url])
      .map((t) => toTrack(album, t, sourceLabel))
    // Two records at once is nobody's idea of listening: pause the other player first.
    // Remember that it is paused now: while Kissa's own record is the system's session, Windows
    // stops reporting the other player, and a second toggle here would start it again.
    if (externalSession.playing) {
      externalSession.playing = false
      void window.electron?.mediaPlayPause?.()
    }
    usePlayerStore.setState({
      currentTrack: toTrack(album, track, sourceLabel),
      queue,
      progress: Math.max(0, Math.floor(position)),
      isPlaying: true
    })
    set({ resume: null })
  },

  resumeAlbum: () => {
    const { resume } = get()
    if (resume) get().play(resume.index, resume.position)
  },

  suspend: () => {
    const player = usePlayerStore.getState()
    const index = albumIndexOf(get().album, player.currentTrack?.audioUrl)
    if (index >= 0) set({ resume: { index, position: player.progress } })
  },

  trackFailed: async (url) => {
    let problem: TrackProblem = 'damaged'
    try {
      problem = (await window.electron?.albumTrackProblem?.(url)) ?? 'damaged'
    } catch {
      /* keep 'damaged' */
    }
    set((s) => ({ problems: { ...s.problems, [url]: problem } }))
    const player = usePlayerStore.getState()
    usePlayerStore.setState({ queue: player.queue.filter((t) => t.audioUrl !== url) })
    // Skip it and go on with the album, the way a jumping record is lifted to the next track.
    if (usePlayerStore.getState().currentTrack?.audioUrl === url)
      usePlayerStore.getState().playNext()
  },

  dismissNotice: () => set({ notice: null })
}))
