import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

// The toast is a small HTML page built inside TrackToast.ts; its styles are checked as text.
const source = readFileSync(join(__dirname, '..', 'TrackToast.ts'), 'utf8')

describe('track toast and reduced motion', () => {
  const reduced = source.match(/@media \(prefers-reduced-motion: reduce\)\{(.*?)\}\}/)?.[1] ?? ''

  it('has a reduced-motion block', () => {
    expect(reduced).not.toBe('')
  })

  it('stills the equaliser bars', () => {
    expect(reduced).toMatch(/\.eq i\{animation:none\}/)
  })

  it('shows the card with a fade only, no slide', () => {
    expect(reduced).toMatch(/\.card\{transition:opacity [^}]*transform:none\}/)
  })
})
