import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getVersion: () => '0', getPath: () => '.' } }))

import { albumArtist, leadArtist } from '../AlbumSidesService'

describe('album artist for the track-list lookup', () => {
  it('keeps commas that are part of a name', () => {
    expect(albumArtist('Tyler, The Creator')).toBe('Tyler, The Creator')
  })
  it('drops featured artists and a paired album name', () => {
    expect(albumArtist('Drake feat. Rihanna')).toBe('Drake')
    expect(albumArtist('Frank Ocean — channel ORANGE')).toBe('Frank Ocean')
  })
  it('offers the lead of a shared credit', () => {
    expect(leadArtist('Kendrick Lamar & SZA')).toBe('Kendrick Lamar')
    expect(leadArtist('Tyler, The Creator')).toBeNull()
  })
})
