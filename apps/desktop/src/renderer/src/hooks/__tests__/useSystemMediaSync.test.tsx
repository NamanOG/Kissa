import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useSystemMediaSync } from '../useSystemMediaSync'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
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
    
    // Exact match -> assume Kissa echo
    triggerPayload(makePayload('', 'Test Song', 'Test Artist'))
    expect(PlaybackClock.setMode).not.toHaveBeenCalledWith(true)

    // Mismatch -> assume genuine external
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
})
