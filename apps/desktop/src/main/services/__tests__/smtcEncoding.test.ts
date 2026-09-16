import { describe, it, expect } from 'vitest'
import { StringDecoder } from 'string_decoder'

describe('SMTC Helper and Worker Encoding Pipeline', () => {
  it('correctly parses Unicode escape sequences for accented characters and emojis', () => {
    // Simulating the JSON emitted by smtc-helper's JsonEscape
    const jsonFromHelper = JSON.stringify({
      type: 'update',
      session: {
        sourceAppId: 'Spotify.exe',
        media: {
          title: 'Canci\u00f3n en Par\u00eds',
          artist: 'Jos\u00e9 Mar\u00eda',
          albumTitle: 'Coraz\u00f3n y Esp\u00edritu',
          albumArtist: 'Jos\u00e9 Mar\u00eda',
          thumbnailBase64: null
        },
        playback: { playbackStatus: 4, playbackType: 1 },
        timeline: { position: 42.5, duration: 215.0 },
        volume: { master: 85, isMuted: false }
      }
    })

    const parsed = JSON.parse(jsonFromHelper)
    expect(parsed.session.media.title).toBe('Canción en París')
    expect(parsed.session.media.artist).toBe('José María')
    expect(parsed.session.media.albumTitle).toBe('Corazón y Espíritu')
    expect(parsed.session.media.title).not.toContain('\uFFFD')
    expect(parsed.session.media.title).not.toContain('?')
  })

  it('StringDecoder preserves multi-byte UTF-8 sequences when chunks are split', () => {
    const decoder = new StringDecoder('utf-8')
    const originalText = 'Canción con í, ó, ñ y emoji 🎵'
    const fullBuffer = Buffer.from(originalText, 'utf-8')

    // Deliberately split right across multi-byte character boundaries
    let reconstructed = ''
    for (let i = 0; i < fullBuffer.length; i += 3) {
      const slice = fullBuffer.subarray(i, Math.min(i + 3, fullBuffer.length))
      reconstructed += decoder.write(slice)
    }
    reconstructed += decoder.end()

    expect(reconstructed).toBe(originalText)
    expect(reconstructed).not.toContain('\uFFFD')
    expect(reconstructed).not.toContain('?')
  })
})
