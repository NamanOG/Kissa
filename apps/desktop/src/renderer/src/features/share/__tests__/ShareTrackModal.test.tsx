import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareTrackModal, getSourceSearchUrl, buildShareText } from '../ShareTrackModal'
import type { TrackInfo } from '@renderer/stores/playerStore'

describe('ShareTrackModal & sharing utilities', () => {
  describe('getSourceSearchUrl', () => {
    it('generates predictable search URLs for Spotify', () => {
      const res = getSourceSearchUrl('Spotify', 'Paranoid Android', 'Radiohead')
      expect(res?.label).toBe('Spotify')
      expect(res?.url).toBe('https://open.spotify.com/search/Paranoid%20Android%20Radiohead')
    })

    it('generates predictable search URLs for Apple Music', () => {
      const res = getSourceSearchUrl('Apple Music', 'Get Lucky', 'Daft Punk')
      expect(res?.label).toBe('Apple Music')
      expect(res?.url).toBe('https://music.apple.com/us/search?term=Get%20Lucky%20Daft%20Punk')
    })

    it('generates predictable search URLs for TIDAL', () => {
      const res = getSourceSearchUrl('TIDAL', 'Blue in Green', 'Miles Davis')
      expect(res?.label).toBe('TIDAL')
      expect(res?.url).toBe('https://listen.tidal.com/search?q=Blue%20in%20Green%20Miles%20Davis')
    })

    it('generates predictable search URLs for YouTube', () => {
      const res = getSourceSearchUrl('YouTube', 'Song Title', 'Artist')
      expect(res?.label).toBe('YouTube')
      expect(res?.url).toBe('https://www.youtube.com/results?search_query=Song%20Title%20Artist')
    })

    it('returns null when title and artist are empty', () => {
      expect(getSourceSearchUrl('Spotify', '', '')).toBeNull()
    })
  })

  describe('buildShareText', () => {
    it('builds preferred share text without fabricating canonical URLs', () => {
      const track: TrackInfo = {
        title: 'Karma Police',
        artist: 'Radiohead',
        album: 'OK Computer',
        duration: 261,
        source: 'Spotify'
      }

      const text = buildShareText(track)
      expect(text).toContain('Listening to Karma Police by Radiohead\non Spotify with Kissa.')
      expect(text).toContain('Find the track on Spotify:')
      expect(text).toContain('https://open.spotify.com/search/Karma%20Police%20Radiohead')
      expect(text).toContain('https://github.com/NamanOG/Kissa')
    })
  })

  describe('ShareTrackModal component', () => {
    const mockTrack: TrackInfo = {
      title: 'Time',
      artist: 'Pink Floyd',
      album: 'The Dark Side of the Moon',
      duration: 413,
      source: 'Apple Music'
    }

    it('renders the track metadata and understated source badge', () => {
      render(<ShareTrackModal isOpen={true} onClose={vi.fn()} track={mockTrack} />)

      expect(screen.getByText('Share Track')).toBeInTheDocument()
      expect(screen.getByText('Time')).toBeInTheDocument()
      expect(screen.getByText('Pink Floyd')).toBeInTheDocument()
      expect(screen.getByText('Apple Music · Following')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Copy Share Text/i })).toBeInTheDocument()
    })

    it('copies share text to clipboard when clicking Copy Share Text', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: { writeText }
      })

      render(<ShareTrackModal isOpen={true} onClose={vi.fn()} track={mockTrack} />)

      const copyBtn = screen.getByRole('button', { name: /Copy Share Text/i })
      fireEvent.click(copyBtn)

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Listening to Time by Pink Floyd'))
    })
  })
})
