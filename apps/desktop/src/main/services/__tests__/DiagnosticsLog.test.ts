import { describe, expect, it } from 'vitest'
import { DiagnosticsLog, type DiagnosticsFs } from '../DiagnosticsLog'

function memoryFs(): DiagnosticsFs & { files: Map<string, string> } {
  const files = new Map<string, string>()
  return {
    files,
    append: (p, t) => files.set(p, (files.get(p) ?? '') + t),
    size: (p) => (files.get(p) ?? '').length,
    read: (p) => files.get(p) ?? '',
    write: (p, t) => files.set(p, t)
  }
}

const fixedNow = () => new Date('2026-10-19T10:00:00.000Z')

describe('DiagnosticsLog', () => {
  it('writes one line per event with codes only', () => {
    const fs = memoryFs()
    new DiagnosticsLog('log', 1024, fs, fixedNow).record('helper-exit', { exitCode: '0xC0000374', restartInMs: 2000 })
    expect(fs.files.get('log')).toBe('2026-10-19T10:00:00.000Z helper-exit exitCode=0xC0000374 restartInMs=2000\n')
  })

  it('drops anything that is not a short token, such as titles or paths', () => {
    const fs = memoryFs()
    new DiagnosticsLog('log', 1024, fs, fixedNow).record('helper-exit', {
      reason: 'Superhero (Heroes & Villains)',
      path: 'C:\\Users\\someone\\AppData'
    })
    expect(fs.files.get('log')).toContain('reason=redacted path=redacted')
    expect(fs.files.get('log')).not.toContain('Superhero')
    expect(fs.files.get('log')).not.toContain('someone')
  })

  it('stays under its size limit and keeps the newest lines', () => {
    const fs = memoryFs()
    const log = new DiagnosticsLog('log', 400, fs, fixedNow)
    for (let i = 0; i < 50; i++) log.record('unresponsive', { n: i })
    const text = fs.files.get('log') ?? ''
    expect(text.length).toBeLessThanOrEqual(400)
    expect(text).toContain('n=49')
    expect(text).not.toContain('n=0\n')
    expect(text.split('\n')[0]).toMatch(/^2026-/)
  })

  it('never throws when the disk fails', () => {
    const fs = memoryFs()
    fs.append = () => {
      throw new Error('disk full')
    }
    expect(() => new DiagnosticsLog('log', 400, fs, fixedNow).record('x')).not.toThrow()
  })
})
