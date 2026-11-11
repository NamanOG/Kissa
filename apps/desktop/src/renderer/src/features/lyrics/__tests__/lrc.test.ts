import { describe, expect, it } from 'vitest'
import { parseLrc, parseWordTags } from '../lrc'

describe('enhanced LRC word tags', () => {
  it('reads real word timings and strips the tags from the text', () => {
    const [line] = parseLrc('[00:12.00]<00:12.00>Hello <00:12.60>bright <00:13.40>world\n[00:16.00]Next')
    expect(line.text).toBe('Hello bright world')
    expect(line.timingType).toBe('real')
    const w = (line.tokens ?? []).filter((t) => !t.isWhitespace)
    expect(w.map((t) => [t.text, t.startTime, t.endTime])).toEqual([
      ['Hello', 12, 12.6],
      ['bright', 12.6, 13.4],
      ['world', 13.4, 16]
    ])
  })

  it('applies the lyrics offset to word times too', () => {
    const [line] = parseLrc('[00:10.00]<00:10.00>One <00:11.00>two', 0.5)
    const w = (line.tokens ?? []).filter((t) => !t.isWhitespace)
    expect(w[0].startTime).toBeCloseTo(10.5)
    expect(w[1].startTime).toBeCloseTo(11.5)
  })

  it('returns null for a body without tags, and plain lines carry no estimated words', () => {
    expect(parseWordTags('Just words', 0, 5)).toBeNull()
    const [line] = parseLrc('[00:01.00]Just words\n[00:03.00]After')
    expect(line.timingType).toBe('estimated')
    expect(line.text).toBe('Just words')
    expect(line.tokens).toBeUndefined()
  })

  it('never shows a tag as lyric text, even a malformed line', () => {
    const lines = parseLrc('[00:05.00]<00:05.00>Only <00:05.40>')
    expect(lines[0].text).toBe('Only')
    expect(lines.every((l) => !l.text.includes('<'))).toBe(true)
  })
})
