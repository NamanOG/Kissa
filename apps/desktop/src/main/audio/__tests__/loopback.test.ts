import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ desktopCapturer: {}, session: {} }))

import { isTrustedFrame } from '../loopback'

describe('loopback capture', () => {
  it('answers only Kissa’s own main frame', () => {
    const main = { processId: 4, routingId: 1 }
    expect(isTrustedFrame({ processId: 4, routingId: 1 }, main)).toBe(true)
    expect(isTrustedFrame({ processId: 4, routingId: 2 }, main)).toBe(false)
    expect(isTrustedFrame({ processId: 9, routingId: 1 }, main)).toBe(false)
    expect(isTrustedFrame(null, main)).toBe(false)
    expect(isTrustedFrame(main, null)).toBe(false)
  })
})
