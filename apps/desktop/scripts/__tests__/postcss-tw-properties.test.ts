import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const plugin = require('../postcss-tw-properties.cjs')

const run = (css: string): string => postcss([plugin()]).process(css, { from: undefined }).css

describe('postcss-tw-properties', () => {
  it('moves the --tw-* defaults into non-inheriting registered properties', () => {
    const out = run(`*, ::before, ::after { --tw-translate-x: 0; --tw-blur:  ; }
::backdrop { --tw-translate-x: 0; --tw-blur:  ; }
.a { transform: translateX(var(--tw-translate-x)); }`)
    expect(out).toMatch(/@property --tw-translate-x \{\s*syntax: '\*';\s*inherits: false;\s*initial-value: 0;\s*\}/)
    expect(out).toMatch(/@property --tw-blur \{[^}]*initial-value: ?;\s*\}/)
    expect(out).not.toMatch(/\*, ::before, ::after/)
    expect(out).not.toMatch(/::backdrop/)
    expect(out.match(/@property --tw-translate-x/g)).toHaveLength(1)
    expect(out).toContain('.a { transform: translateX(var(--tw-translate-x)); }')
  })

  it('keeps other declarations of the same selector', () => {
    const out = run('*, ::before, ::after { box-sizing: border-box; --tw-rotate: 0; }')
    expect(out).toContain('box-sizing: border-box')
    expect(out).not.toMatch(/\{[^}]*--tw-rotate: 0/)
    expect(out).toContain('@property --tw-rotate')
  })

  it('leaves --tw variables set by utilities alone', () => {
    const out = run('.shadow { --tw-shadow: 0 1px 2px #000; }')
    expect(out).toBe('.shadow { --tw-shadow: 0 1px 2px #000; }')
  })

  it('keeps @import first', () => {
    const out = run('@import "x.css";\n*, ::before, ::after { --tw-rotate: 0; }')
    expect(out.indexOf('@import')).toBe(0)
  })
})
