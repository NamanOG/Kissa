import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useSystemMediaSync } from '../useSystemMediaSync'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { useAlbumStore } from '@renderer/features/album/albumStore'
import type { SystemMediaPayload } from '../../../../types/media'

const Harness = (): null => {
  useSystemMediaSync()
  return null
}

describe('useSystemMediaSync', () => {
  let triggerPayload: (payload: SystemMediaPayload | null) => void

  beforeEach(() => {
    vi.spyOn(PlaybackClock, 'setMode')
    vi.spyOn(PlaybackClock, 'setSmtcState')
    
    window.electron = {
      getSystemMedia: vi.fn().mockResolvedValue(null),
      onSystemMediaUpdate: vi.fn((cb) => {
        triggerPayload = cb
        return () => {} // cleanup
      })
    } as any

    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      volume: 100
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (window as Partial<Window>).electron
  })

  const makePayload = (sourceAppId: string, title = 'Test Song', artist = 'Test Artist'): SystemMediaPayload => ({
    sourceAppId,
    sourceAppName: sourceAppId || 'Unknown',
    title,
    artist,
    album: 'Album',
    isPlaying: true,
    progress: 10,
    duration: 100
  })

  it('1. ignores Kissa sourceAppId when internal audio is loaded (Kissa echo)', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'Test Song', artist: 'Test Artist' } as any,
      isPlaying: true
    })
    
    triggerPayload(makePayload('com.namanog.kissa'))
    
    expect(PlaybackClock.setMode).not.toHaveBeenCalledWith(true)
  })

  it('2. processes Spotify sourceAppId even if internal audio is loaded', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'My Local Track', artist: 'Local' } as any,
      isPlaying: true
    })
    
    triggerPayload(makePayload('Spotify.exe', 'External Song', 'External Artist'))
    
    expect(PlaybackClock.setMode).toHaveBeenCalledWith(true)
    // The store should reflect the external payload's playing state (which is true)
    expect(usePlayerStore.getState().isPlaying).toBe(true) 
  })

  it('3. processes Apple Music sourceAppId even if internal audio is loaded', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'My Local Track', artist: 'Local' } as any,
      isPlaying: true
    })
    
    triggerPayload(makePayload('AppleMusic.exe', 'External Song', 'External Artist'))
    
    expect(PlaybackClock.setMode).toHaveBeenCalledWith(true)
  })

  it('4. processes Spotify payload when Kissa is paused but internal track is loaded', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'My Local Track', artist: 'Local' } as any,
      isPlaying: false // Paused
    })
    
    triggerPayload(makePayload('Spotify.exe', 'External Song', 'External Artist'))
    
    expect(PlaybackClock.setMode).toHaveBeenCalledWith(true)
    expect(usePlayerStore.getState().currentTrack?.sourceAppId).toBe('Spotify.exe')
  })

  it('6. safely falls back if sourceAppId is missing, using title/artist matching', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'Test Song', artist: 'Test Artist' } as any,
      isPlaying: true
    })
    
    triggerPayload(makePayload('', 'Test Song', 'Test Artist'))
    expect(PlaybackClock.setMode).not.toHaveBeenCalledWith(true)

    triggerPayload(makePayload('', 'Different Song', 'Test Artist'))
    expect(PlaybackClock.setMode).toHaveBeenCalledWith(true)
  })

  it('7. verifies Kissa echo cannot call PlaybackClock.setMode(true)', () => {
    render(<Harness />)
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'local.mp3', title: 'Test Song', artist: 'Test Artist' } as any,
      isPlaying: true
    })
    
    triggerPayload(makePayload('electron.exe', 'Test Song', 'Test Artist'))
    expect(PlaybackClock.setMode).not.toHaveBeenCalledWith(true)
  })

  it('7b. treats the dev window session ("Kissa") as an echo, so an album track change stays', () => {
    render(<Harness />)
    document.title = 'Kissa'
    usePlayerStore.setState({
      currentTrack: { audioUrl: 'kissa-album://track/1/3', title: 'Yankee Tone', artist: 'Tones' } as any,
      isPlaying: true
    })

    triggerPayload(makePayload('electron.exe', 'Kissa', ''))
    expect(PlaybackClock.setMode).not.toHaveBeenCalledWith(true)
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Yankee Tone')
  })

  it('8. preserves accented characters in track title, artist, and album', () => {
    render(<Harness />)
    const accentedPayload: SystemMediaPayload = {
      sourceAppId: 'Spotify.exe',
      sourceAppName: 'Spotify',
      title: 'Canción en París',
      artist: 'José María',
      album: 'Corazón y Espíritu',
      isPlaying: true,
      progress: 30,
      duration: 200
    }

    triggerPayload(accentedPayload)

    const currentTrack = usePlayerStore.getState().currentTrack
    expect(currentTrack?.title).toBe('Canción en París')
    expect(currentTrack?.artist).toBe('José María')
    expect(currentTrack?.album).toBe('Corazón y Espíritu')
    expect(currentTrack?.title).not.toContain('\uFFFD')
    expect(currentTrack?.title).not.toContain('?')
  })

  describe('a Kissa album and other players', () => {
    const albumTrack = {
      audioUrl: 'kissa-album://track/1/0',
      title: 'Zulu',
      artist: 'Fixture Band',
      album: 'Tone Suite',
      duration: 30
    } as any
    const apple = (isPlaying: boolean, title = 'Digits'): SystemMediaPayload => ({
      ...makePayload('AppleInc.AppleMusicWin_nzyj5cx40ttqa!App', title, 'Apple Artist'),
      isPlaying
    })
    const albumOn = (isPlaying = true): void => {
      useAlbumStore.setState({
        album: {
          title: 'Tone Suite',
          artist: 'Fixture Band',
          coverDataUrl: '',
          order: 'tags',
          leftOut: [],
          tracks: [{ url: albumTrack.audioUrl, title: 'Zulu', artist: 'Fixture Band', disc: 1, track: 1, duration: 30, fileName: '1.flac' }]
        },
        resume: null
      })
      usePlayerStore.setState({ currentTrack: albumTrack, isPlaying, progress: 12 })
    }

    it('keeps the album while the player that was already playing keeps reporting', () => {
      render(<Harness />)
      triggerPayload(apple(true)) // Apple Music playing before the album
      albumOn()
      triggerPayload(apple(true))
      triggerPayload(apple(true))
      expect(usePlayerStore.getState().currentTrack?.audioUrl).toBe(albumTrack.audioUrl)
      expect(usePlayerStore.getState().isPlaying).toBe(true)
    })

    it('keeps the album when the other player reports that it is paused', () => {
      render(<Harness />)
      albumOn()
      triggerPayload(apple(false))
      expect(usePlayerStore.getState().currentTrack?.audioUrl).toBe(albumTrack.audioUrl)
      expect(usePlayerStore.getState().isPlaying).toBe(true)
    })

    it('steps aside when the listener starts the other player, and keeps the place to resume', () => {
      render(<Harness />)
      triggerPayload(apple(true))
      albumOn()
      triggerPayload(apple(false)) // Kissa paused Apple Music when the album started
      triggerPayload(apple(true)) // ... and the listener pressed play there
      expect(usePlayerStore.getState().currentTrack?.title).toBe('Digits')
      expect(useAlbumStore.getState().resume).toEqual({ index: 0, position: 12 })
    })

    it('steps aside when the other player starts a new song while the album plays', () => {
      render(<Harness />)
      triggerPayload(apple(true))
      albumOn()
      triggerPayload(apple(true, 'Another Song'))
      expect(usePlayerStore.getState().currentTrack?.title).toBe('Another Song')
    })

    it('lets a playing player take over once the album is paused', () => {
      render(<Harness />)
      triggerPayload(apple(true))
      albumOn(false)
      triggerPayload(apple(true))
      expect(usePlayerStore.getState().currentTrack?.title).toBe('Digits')
    })
  })
})
