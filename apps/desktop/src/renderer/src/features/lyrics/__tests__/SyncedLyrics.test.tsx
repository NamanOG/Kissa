import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { SyncedLyrics, parseLrc } from '../SyncedLyrics'
import { usePlayerStore } from '@renderer/stores/playerStore'

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

describe('SyncedLyrics Component & Parser', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
    window.electron = { getLyrics: vi.fn().mockResolvedValue({ syncedLyrics: DEFAULT_SYNCED_LRC }) } as any
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Self Control',
        artist: 'Frank Ocean',
        album: 'Blonde',
        duration: 249
      },
      progress: 5
    })
  })

  it('parses LRC timestamped format correctly', () => {
    const lrc = `
      [00:03.50] Pool side convo
      [00:08.50] About your summer last night
    `
    const parsed = parseLrc(lrc)
    expect(parsed.length).toBe(2)
    expect(parsed[0].time).toBeCloseTo(3.95)
    expect(parsed[0].text).toBe('Pool side convo')
    expect(parsed[1].time).toBeCloseTo(8.95)
    expect(parsed[1].text).toBe('About your summer last night')
  })

  it('renders default track synced lyrics', async () => {
    render(<SyncedLyrics />)
    await waitFor(() => expect(screen.getByText(/Pool/i)).toBeInTheDocument())
    expect(screen.getByText(/convo/i)).toBeInTheDocument()
    expect(screen.getByText('Ooh')).toBeInTheDocument()
    expect(screen.getByText('yeah,')).toBeInTheDocument()
  })

  it('seeks to line timestamp when clicked', async () => {
    render(<SyncedLyrics />)
    // Find the container div for a lyric line by clicking a word in it
    const wordEl = await waitFor(() => screen.getByText('Ooh'))
    const lineEl = wordEl.closest('.group')!
    await act(async () => fireEvent.click(lineEl))

    expect(usePlayerStore.getState().progress).toBeCloseTo(8.95)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('generates estimated tokens correctly bounded within line duration', () => {
    const lrc = `
      [00:03.50] Hello world
      [00:06.50] Next line
    `
    const parsed = parseLrc(lrc)
    const line = parsed[0]
    expect(line.timingType).toBe('estimated')
    expect(line.endTime).toBeCloseTo(6.95) // inferred from next line

    const tokens = line.tokens!
    expect(tokens.length).toBeGreaterThan(0)
    
    // First token should start at line.time
    expect(tokens[0].startTime).toBeCloseTo(3.95)
    // Last token should end at line.endTime
    expect(tokens[tokens.length - 1].endTime).toBeCloseTo(6.95)

    // Token times must be contiguous and bounded
    let previousEnd = tokens[0].startTime
    for (const t of tokens) {
      expect(t.startTime).toBeGreaterThanOrEqual(3.95)
      expect(t.endTime).toBeLessThanOrEqual(6.95)
      expect(t.startTime).toBeCloseTo(previousEnd)
      previousEnd = t.endTime
    }
  })

  it('caps the final line duration correctly', () => {
    const lrc = `
      [00:00.00] One line only
    `
    const parsed = parseLrc(lrc)
    const line = parsed[0]
    expect(line.endTime).toBeCloseTo(6.45) // fallback is 6 seconds + 0.45s offset, up to 8 max
  })
})
