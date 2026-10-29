import { describe, expect, it } from 'vitest'
import { buildJumpTasks, jumpPlaceFromArgv } from '../jumpList'
import { sanitizeToastPayload } from '../toastPayload'

describe('jump list', () => {
  it('reads the place a task opened Kissa with', () => {
    expect(jumpPlaceFromArgv(['kissa.exe', '--kissa-open=lyrics'])).toBe('lyrics')
    expect(jumpPlaceFromArgv(['kissa.exe', '--kissa-open=focus'])).toBe('focus')
  })

  it('ignores anything it does not know', () => {
    expect(jumpPlaceFromArgv(['kissa.exe', '--kissa-open=../../etc'])).toBeNull()
    expect(jumpPlaceFromArgv(['kissa.exe', '--hidden'])).toBeNull()
  })

  it('builds four tasks in the given language, falling back to English', () => {
    const tasks = buildJumpTasks('C:\\Kissa.exe', { lyrics: 'Letras', shelf: '  ' })
    expect(tasks.map((t) => t.arguments)).toEqual([
      '--kissa-open=lyrics',
      '--kissa-open=shelf',
      '--kissa-open=focus',
      '--kissa-open=mini'
    ])
    expect(tasks[0].title).toBe('Letras')
    expect(tasks[1].title).toBe('Shelf')
    expect(tasks.every((t) => t.program === 'C:\\Kissa.exe')).toBe(true)
  })
})

describe('song change card payload', () => {
  it('keeps text, a picture and a colour', () => {
    const p = sanitizeToastPayload({ title: 'So What', artist: 'Miles Davis', artwork: 'data:image/png;base64,AAAA', accent: '#d9a066' })
    expect(p).toEqual({ title: 'So What', artist: 'Miles Davis', artwork: 'data:image/png;base64,AAAA', accent: '#d9a066', label: undefined, playing: true })
  })

  it('takes a catalogue cover by https, and says whether the music plays', () => {
    const p = sanitizeToastPayload({ title: 'x', artwork: 'https://is1-ssl.mzstatic.com/a/1200x1200bb.jpg', playing: false })
    expect(p?.artwork).toBe('https://is1-ssl.mzstatic.com/a/1200x1200bb.jpg')
    expect(p?.playing).toBe(false)
  })

  it('drops anything that is not an image address or a plain colour', () => {
    for (const artwork of ['http://plain.example/a.png', 'javascript:alert(1)', 'https://x.example/a.png")', 'data:text/html;base64,AAAA']) {
      expect(sanitizeToastPayload({ title: 'x', artwork })?.artwork).toBeUndefined()
    }
    expect(sanitizeToastPayload({ title: 'x', accent: 'red;}' })?.accent).toBeUndefined()
  })

  it('refuses a card with no title', () => {
    expect(sanitizeToastPayload({ title: '  ' })).toBeNull()
    expect(sanitizeToastPayload(null)).toBeNull()
  })
})
