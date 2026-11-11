import { describe, expect, it } from 'vitest'
import { parseLrc } from '../lrc'

describe('parseLrc timing', () => {
  it("honours the file's own [offset:] tag (positive shows the words earlier)", () => {
    const lines = parseLrc('[offset:+500]\n[00:10.00] First\n[00:12.00] Second')
    expect(lines.map((l) => l.time)).toEqual([9.5, 11.5])
  })

  it('adds the listener nudge on top of the file offset', () => {
    const lines = parseLrc('[offset:-250]\n[00:10.00] First', 0.5)
    expect(lines[0].time).toBeCloseTo(10.75, 3)
  })

  it('starts each line at its own timestamp, not the next one', () => {
    const lines = parseLrc('[00:10.00] First\n[00:12.00] Second')
    expect(lines[0].time).toBe(10)
    expect(lines[1].time).toBe(12)
  })
})
