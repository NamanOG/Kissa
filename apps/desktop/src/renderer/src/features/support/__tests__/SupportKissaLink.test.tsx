import { describe, expect, it, vi } from 'vitest'
import { openSupportPage, resolveSupportUrl } from '../SupportKissaLink'
import { hasValidUpi, supportIsConfigured, upiLink, type SupportConfig } from '../../../../../../../../config/support'

const empty: SupportConfig = { upiId: null, upiName: null, upiQrImage: null, international: null }
const upiOnly: SupportConfig = { ...empty, upiId: 'someone@okbank', upiName: 'Someone' }

describe('support settings', () => {
  it('valid UPI details alone switch support on; the international option is not needed', () => {
    expect(supportIsConfigured(empty)).toBe(false)
    expect(supportIsConfigured(upiOnly)).toBe(true)
    expect(resolveSupportUrl(upiOnly)).toBe('https://kissa.glyphcode.studio/support/')
    expect(resolveSupportUrl(empty)).toBeNull()
  })

  it('refuses malformed UPI details', () => {
    expect(hasValidUpi({ ...upiOnly, upiId: 'not a vpa' })).toBe(false)
    expect(hasValidUpi({ ...upiOnly, upiId: 'someone@' })).toBe(false)
    expect(hasValidUpi({ ...upiOnly, upiName: '  ' })).toBe(false)
    expect(supportIsConfigured({ ...empty, international: { label: 'X', url: 'http://insecure.example' } })).toBe(false)
  })

  it('builds a UPI link with the payee and no fixed amount', () => {
    const link = upiLink(upiOnly)!
    expect(link.startsWith('upi://pay?')).toBe(true)
    const params = new URLSearchParams(link.slice('upi://pay?'.length))
    expect(params.get('pa')).toBe('someone@okbank')
    expect(params.get('pn')).toBe('Someone')
    expect(params.has('am')).toBe(false)
  })

  it('a preview address must be https', () => {
    expect(resolveSupportUrl(empty, 'http://localhost:4173/support/')).toBeNull()
    expect(resolveSupportUrl(empty, 'https://preview.example/support/')).toBe('https://preview.example/support/')
  })
})

describe('openSupportPage', () => {
  it('opens the support page in the browser, nothing inside the app', () => {
    const openExternal = vi.fn(async () => undefined)
    Object.defineProperty(window, 'electron', { value: { openExternal }, configurable: true })
    openSupportPage('https://kissa.glyphcode.studio/support/')
    expect(openExternal).toHaveBeenCalledWith('https://kissa.glyphcode.studio/support/')
    openSupportPage(null)
    expect(openExternal).toHaveBeenCalledTimes(1)
  })
})
