import { describe, expect, it, vi } from 'vitest'
import { buildFrame, createFrameSender, pickDesktopLines } from '../desktopLyricsFeed'
import { parseLrc } from '../../lyrics/lrc'

const LRC = ['[00:10.00]First line', '[00:14.00]Second line', '[00:18.00]Third line', '[00:40.00]After the break'].join(
  '\n'
)
const lines = parseLrc(LRC)

describe('pickDesktopLines', () => {
  it('shows only the next line before the first one starts', () => {
    expect(pickDesktopLines(lines, 2)).toEqual({ current: '', next: 'First line' })
  })

  it('lights a line slightly before its timestamp', () => {
    expect(pickDesktopLines(lines, 9.9)).toMatchObject({ current: 'First line', next: 'Second line' })
  })

  it('pairs the sung line with the one after it', () => {
    expect(pickDesktopLines(lines, 15)).toMatchObject({ current: 'Second line', next: 'Third line' })
  })

  it('drops the current line in a long instrumental break but keeps the next', () => {
    const end = lines[2].endTime ?? lines[2].time + 6
    expect(pickDesktopLines(lines, end + 3)).toEqual({ current: '', next: 'After the break' })
  })

  it('shows nothing after the last line has ended', () => {
    expect(pickDesktopLines(lines, 400)).toEqual({ current: '', next: '' })
  })

  it('handles no lyrics', () => {
    expect(pickDesktopLines([], 5)).toEqual({ current: '', next: '' })
  })
})

describe('buildFrame', () => {
  const base = { lines, time: 15, playing: true, covered: false, accent: '#aabbcc' }

  it('is visible while playing with words to show', () => {
    expect(buildFrame(base)).toMatchObject({ visible: true, current: 'Second line', next: 'Third line', accent: '#aabbcc' })
  })

  it('hides and clears the words when paused', () => {
    expect(buildFrame({ ...base, playing: false })).toMatchObject({ visible: false, current: '', next: '' })
  })

  it('hides while Kissa fills the screen (full screen or Party mode)', () => {
    expect(buildFrame({ ...base, covered: true }).visible).toBe(false)
  })

  it('hides when no synced lyrics were found', () => {
    expect(buildFrame({ ...base, lines: [] }).visible).toBe(false)
  })
})

describe('createFrameSender', () => {
  it('sends once per line, not once per clock tick', () => {
    const send = vi.fn()
    const sender = createFrameSender(send)
    // Sixty ticks a second across the whole of the second line, then into the third.
    for (let t = 14; t < 18.5; t += 1 / 60) {
      sender.push(buildFrame({ lines, time: t, playing: true, covered: false }))
    }
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0].current).toBe('Second line')
    expect(send.mock.calls[1][0].current).toBe('Third line')
  })

  it('sends again when visibility or colour changes, and after a reset', () => {
    const send = vi.fn()
    const sender = createFrameSender(send)
    const frame = buildFrame({ lines, time: 15, playing: true, covered: false })
    expect(sender.push(frame)).toBe(true)
    expect(sender.push({ ...frame })).toBe(false)
    expect(sender.push({ ...frame, accent: '#123456' })).toBe(true)
    expect(sender.push({ ...frame, accent: '#123456', visible: false })).toBe(true)
    sender.reset()
    expect(sender.push({ ...frame, accent: '#123456', visible: false })).toBe(true)
    expect(send).toHaveBeenCalledTimes(4)
  })
})

describe('word timings in frames', () => {
  it('carries the sung line words relative to its start, and how far in it is (real word timing)', () => {
    const timed = parseLrc('[00:14.00]<00:14.00>Second <00:15.20>line\n[00:18.00]Next')
    const f = buildFrame({ lines: timed, time: 15, playing: true, covered: false })
    expect(f.lineStart).toBe(14)
    expect(f.elapsed).toBeCloseTo(1)
    expect(f.words?.map((w) => w.text)).toEqual(['Second', 'line'])
    expect(f.words?.[0].start).toBeCloseTo(0)
    expect(f.words?.[1].end).toBeLessThanOrEqual(4)
  })

  it('sends no words for a plain line: the window lights it whole', () => {
    const f = buildFrame({ lines, time: 15, playing: true, covered: false })
    expect(f.words).toBeUndefined()
  })

  it('restarts the fill for a repeated identical line without sending every tick', () => {
    const repeat = parseLrc('[00:01.00]Yeah\n[00:02.00]Yeah\n[00:03.00]Done')
    const send = vi.fn()
    const sender = createFrameSender(send)
    for (let t = 0.9; t < 2.9; t += 1 / 60) sender.push(buildFrame({ lines: repeat, time: t, playing: true, covered: false }))
    expect(send.mock.calls.map((c) => [c[0].current, c[0].lineStart])).toEqual([
      ['Yeah', 1],
      ['Yeah', 2],
      ['Done', 3]
    ])
  })
})
