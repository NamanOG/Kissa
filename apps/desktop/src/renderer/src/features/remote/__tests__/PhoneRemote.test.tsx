import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PhoneRemoteButton } from '../PhoneRemoteButton'
import { encodeQr } from '../qr'
import { REMOTE_OFF, useRemoteStore } from '../remoteStore'
import { nowPlayingSnapshot, runRemoteCommand } from '../usePhoneRemote'
import { usePlayerStore } from '@renderer/stores/playerStore'
import type { PhoneRemoteStatus } from '../../../../../types/remote'

const ON: PhoneRemoteStatus = {
  on: true,
  url: 'http://192.168.1.20:47330',
  pairUrl: 'http://192.168.1.20:47330/',
  code: '042917',
  phones: 0
}

describe('QR encoder', () => {
  it('picks the smallest version and draws the three finder eyes', () => {
    expect(encodeQr('hi').length).toBe(21) // version 1
    const grid = encodeQr('http://192.168.1.20:47330/#k=abcdefghijklmnopqrstuvwxyz012345')
    expect(grid.length).toBe(33) // version 4 for text this long
    const n = grid.length
    for (const [x, y] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7]
    ]) {
      expect(grid[y][x]).toBe(true)
      expect(grid[y + 1][x + 1]).toBe(false)
      expect(grid[y + 3][x + 3]).toBe(true)
    }
    // Timing pattern between the eyes alternates.
    for (let i = 8; i < n - 8; i++) expect(grid[6][i]).toBe(i % 2 === 0)
  })
})

describe('Phone remote on the dock', () => {
  const setPhoneRemoteOn = vi.fn(async (on: boolean) => (on ? ON : REMOTE_OFF))

  beforeEach(() => {
    useRemoteStore.setState({ status: REMOTE_OFF, busy: false })
    ;(window as unknown as { electron: unknown }).electron = { setPhoneRemoteOn }
  })
  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron
    setPhoneRemoteOn.mockClear()
  })

  it('is off until switched on, then shows the QR code and the six digits', async () => {
    render(<PhoneRemoteButton />)
    const button = screen.getByTestId('phone-remote-button')
    expect(button.getAttribute('aria-label')).toBe('Phone remote: Off')
    fireEvent.click(button)
    expect(screen.getByRole('dialog', { name: 'Phone remote' })).toBeInTheDocument()
    expect(screen.queryByTestId('remote-qr')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Use your phone as a remote' }))
    })
    expect(setPhoneRemoteOn).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('remote-qr')).toBeInTheDocument()
    expect(screen.getByTestId('phone-remote-code').textContent).toBe('042917')
    expect(screen.getByText('No camera? Open 192.168.1.20:47330 on your phone')).toBeInTheDocument()
    expect(button.getAttribute('aria-label')).toBe('Phone remote: On, waiting for your phone')

    act(() => useRemoteStore.getState().setStatus({ ...ON, phones: 1 }))
    expect(screen.getByTestId('phone-remote-state').textContent).toBe('On, your phone is connected')
  })

  it('says why it could not switch on', () => {
    useRemoteStore.setState({ status: { ...REMOTE_OFF, problem: 'no-network' } })
    render(<PhoneRemoteButton />)
    fireEvent.click(screen.getByTestId('phone-remote-button'))
    expect(screen.getByRole('alert').textContent).toContain(
      'could not find a Wi-Fi or wired network'
    )
  })

  it('explains a Public network', () => {
    useRemoteStore.setState({ status: { ...ON, publicNetwork: true } })
    render(<PhoneRemoteButton />)
    fireEvent.click(screen.getByTestId('phone-remote-button'))
    expect(screen.getByRole('alert').textContent).toContain('Public network')
  })

  it('closes on Escape and gives focus back to the button', () => {
    render(<PhoneRemoteButton />)
    const button = screen.getByTestId('phone-remote-button')
    fireEvent.click(button)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})

describe('phone commands', () => {
  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron
  })

  it('send skips to the app that is playing, like the dock does', () => {
    const mediaNext = vi.fn(async () => undefined)
    const mediaPlayPause = vi.fn(async () => undefined)
    ;(window as unknown as { electron: unknown }).electron = { mediaNext, mediaPlayPause }
    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'So What',
        artist: 'Miles Davis',
        album: 'Kind of Blue',
        duration: 562,
        sourceAppId: 'Spotify.exe'
      }
    })
    runRemoteCommand({ action: 'next' })
    expect(mediaNext).toHaveBeenCalledTimes(1)
    runRemoteCommand({ action: 'playPause' })
    expect(mediaPlayPause).toHaveBeenCalledTimes(1)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('shares only an embedded cover, never a file or web address', () => {
    usePlayerStore.setState({
      currentTrack: {
        title: 'A',
        artist: 'B',
        album: 'C',
        duration: 10,
        artworkUrl: 'file:///C:/Users/me/cover.jpg'
      }
    })
    expect(nowPlayingSnapshot()?.artworkDataUrl).toBeUndefined()
    usePlayerStore.setState({
      currentTrack: {
        title: 'A',
        artist: 'B',
        album: 'C',
        duration: 10,
        artworkUrl: 'data:image/jpeg;base64,/9j/'
      }
    })
    expect(nowPlayingSnapshot()?.artworkDataUrl).toBe('data:image/jpeg;base64,/9j/')
  })
})
