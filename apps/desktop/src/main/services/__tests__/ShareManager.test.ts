import { describe, it, expect } from 'vitest'
import { _test_sanitizeFilename as sanitizeFilename, _test_validateShareOptions as validateShareOptions } from '../ShareManager'

describe('ShareManager', () => {
  describe('sanitizeFilename', () => {
    it('removes traversal characters', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('/')
      expect(sanitizeFilename('..\\..\\windows\\system32')).not.toContain('\\')
    })

    it('removes illegal Windows characters', () => {
      expect(sanitizeFilename('my:album*card?')).toBe('myalbumcard')
      expect(sanitizeFilename('album<|>')).toBe('album')
    })

    it('trims whitespace and dots', () => {
      expect(sanitizeFilename(' . album . ')).toBe('album')
      expect(sanitizeFilename('...album...')).toBe('album')
    })

    it('prevents reserved Windows names', () => {
      expect(sanitizeFilename('CON')).toBe('share')
      expect(sanitizeFilename('PRN')).toBe('share')
      expect(sanitizeFilename('COM1')).toBe('share')
      expect(sanitizeFilename('LPT9')).toBe('share')
    })

    it('bounds filename length', () => {
      const longName = 'a'.repeat(200)
      expect(sanitizeFilename(longName).length).toBe(100)
    })
  })

  describe('validateShareOptions', () => {
    const validAlbumPayload = {
      action: 'save',
      payload: {
        type: 'album',
        aspectRatio: '4:5',
        data: {
          album: 'Test Album',
          artist: 'Test Artist',
          playCount: 5,
          firstListened: 12345,
          lastListened: 12345,
          tracksEncountered: ['Track 1']
        }
      }
    }

    it('accepts valid payload', () => {
      expect(validateShareOptions(validAlbumPayload)).toBe(true)
    })

    it('rejects invalid action', () => {
      const p = structuredClone(validAlbumPayload) as any
      p.action = 'delete'
      expect(validateShareOptions(p)).toBe(false)
    })

    it('rejects invalid share type', () => {
      const p = structuredClone(validAlbumPayload) as any
      p.payload.type = 'invalid-type'
      expect(validateShareOptions(p)).toBe(false)
    })

    it('rejects invalid aspect ratio', () => {
      const p = structuredClone(validAlbumPayload) as any
      p.payload.aspectRatio = '16:9'
      expect(validateShareOptions(p)).toBe(false)
    })

    it('rejects malformed data', () => {
      const p = structuredClone(validAlbumPayload) as any
      p.payload.data = 'just a string'
      expect(validateShareOptions(p)).toBe(false)
    })

    it('rejects non-finite numbers', () => {
      const p = structuredClone(validAlbumPayload) as any
      p.payload.data.playCount = Infinity
      expect(validateShareOptions(p)).toBe(false)
    })

    it('rejects arrays exceeding limits for collections', () => {
      const p = {
        action: 'copy',
        payload: {
          type: 'collection',
          aspectRatio: '1:1',
          data: Array(10).fill({ album: 'A', artist: 'B' }) // Max 9
        }
      }
      expect(validateShareOptions(p)).toBe(false)
    })
  })
})
