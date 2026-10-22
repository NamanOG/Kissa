import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resolveSupportUrl } from '../SupportKissaLink'
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

describe('SupportKissaLink', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('../../../../../../../../config/support')
    vi.resetModules()
  })

  it('is not shown while support is not set up', async () => {
    vi.resetModules()
    vi.doMock('../../../../../../../../config/support', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../../../../../../../config/support')>()),
      support: empty
    }))
    vi.stubEnv('RENDERER_VITE_SUPPORT_URL', '')
    const { SupportKissaLink } = await import('../SupportKissaLink')
    const { container } = render(<SupportKissaLink />)
    expect(container.innerHTML).toBe('')
  })

  it('opens the support page in the browser, nothing inside the app', async () => {
    vi.stubEnv('RENDERER_VITE_SUPPORT_URL', 'https://kissa.glyphcode.studio/support/')
    const openExternal = vi.fn(async () => undefined)
    Object.defineProperty(window, 'electron', { value: { openExternal }, configurable: true })
    const { SupportKissaLink } = await import('../SupportKissaLink')
    render(<SupportKissaLink />)
    fireEvent.click(screen.getByRole('button', { name: 'Support Kissa' }))
    expect(openExternal).toHaveBeenCalledWith('https://kissa.glyphcode.studio/support/')
  })
})
