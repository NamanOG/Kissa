import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

export const DEFAULT_SYNCED_LRC = `[00:00.00] (Instrumental intro)
[00:03.50] Pool side convo, about your summer last night
[00:08.50] Ooh yeah, about your summer last night
[00:15.00] Ain't give you no play, mm
[00:19.50] Could I make you shine girl?
[00:23.00] Could I make you wait on me?
[00:27.50] If I could take it all back, I would
[00:32.00] You're in my head, you're in my head
[00:36.50] I, I, I know you gotta leave, leave, leave
[00:44.00] Take down some summer time
[00:47.50] Give up, just tonight, night, night
[00:54.00] I, I, I know you got someone comin'
[01:01.00] You're spittin' lost game
[01:04.50] Someone to take your heart
[01:07.50] Someone to make your head spin
[01:10.50] Keep a place for me, for me
[01:17.50] I'll sleep between y'all, it's nothing
[01:24.00] It's nothing, it's nothing
[01:31.00] Keep a place for me
[01:38.00] It's nothing, it's nothing
[01:45.00] It's nothing, it's nothing
[01:54.00] (Guitar interlude)
[02:03.00] Wish we'd grown up on the same street
[02:07.00] Done our thing, done our own thing
[02:11.00] Wish we'd grown up on the same street
[02:15.00] Done our thing, done our own thing
[02:19.00] I, I, I know you gotta leave, leave, leave
[02:26.00] Take down some summer time
[02:30.00] Give up, just tonight, night, night
[02:37.00] I, I, I know you got someone comin'
[02:44.00] You're spittin' lost game
[02:47.00] Keep a place for me, for me
[02:54.00] I'll sleep between y'all, it's nothing
[03:01.00] It's nothing, it's nothing
[03:08.00] Keep a place for me
[03:15.00] It's nothing, it's nothing
[03:22.00] It's nothing, it's nothing
[03:30.00] (Outro choir)
[03:40.00] I, I, I know you gotta leave, leave, leave
[03:52.00] Keep a place for me`
import { FullscreenLyrics } from '../FullscreenLyrics'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('FullscreenLyrics', () => {
  it('renders SyncedLyrics component safely', async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
    window.electron = { getLyrics: vi.fn().mockResolvedValue({ syncedLyrics: DEFAULT_SYNCED_LRC }) } as any
    usePlayerStore.setState({
      currentTrack: {
        title: 'Self Control',
        artist: 'Frank Ocean',
        album: 'Blonde',
        duration: 249
      }
    })

    const { container } = await act(async () => render(<FullscreenLyrics />))
    // The lyrics panel is mounted
    expect(container).toBeInTheDocument()

    // It should render lines from the track
    await waitFor(() => expect(screen.getByText(/Pool/i)).toBeInTheDocument())
    expect(screen.getByText(/convo/i)).toBeInTheDocument()
  })

  it('renders gracefully when no track is provided', async () => {
    usePlayerStore.setState({ currentTrack: null })
    await act(async () => render(<FullscreenLyrics />))
    
    // SyncedLyrics shows waiting or unavailable
    expect(screen.getByText(/Waiting/i)).toBeInTheDocument()
  })
})
