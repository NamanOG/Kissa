import { afterEach, describe, expect, it } from 'vitest'
import { openSheets, sheetOpened } from '../sheetCount'

describe('open sheet count', () => {
  afterEach(() => {
    delete document.documentElement.dataset.kissaSheet
  })

  it('marks the document while any sheet is open, and releases are idempotent', () => {
    const a = sheetOpened()
    const b = sheetOpened()
    expect(openSheets()).toBe(2)
    expect(document.documentElement.hasAttribute('data-kissa-sheet')).toBe(true)
    a()
    a()
    expect(openSheets()).toBe(1)
    expect(document.documentElement.hasAttribute('data-kissa-sheet')).toBe(true)
    b()
    expect(openSheets()).toBe(0)
    expect(document.documentElement.hasAttribute('data-kissa-sheet')).toBe(false)
  })
})
