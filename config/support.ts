/**
 * Voluntary support for Kissa, shared by the website (/support/) and the desktop app
 * ("Support Kissa" on the Deck), so the two can never disagree about whether support is live.
 *
 * Kissa stays completely free: no paywalls, locked features, ads or supporter perks.
 *
 * Every payment detail comes from the owner. Nothing here may be invented. While no valid
 * route is set, the website does not publish /support/ and the app shows no link to it.
 * Valid UPI details on their own are enough; the international option is added later.
 */
export interface SupportConfig {
  /** Public UPI ID (VPA), e.g. name@bank. */
  upiId: string | null
  /** Payee name, as UPI apps should show it. */
  upiName: string | null
  /** The owner's exported QR, unchanged, under apps/website/public/, e.g. 'media/support/upi-qr.png'. */
  upiQrImage: string | null
  /** Later: an international option once onboarding is verified. */
  international: { label: string; url: string } | null
}

/** Where the published page lives. The app links here only once support is configured. */
export const SUPPORT_PAGE_URL = 'https://kissa.glyphcode.studio/support/'

/** Provided by the owner on 19 Oct 2026. Not published until the website is deployed. */
export const support: SupportConfig = {
  upiId: 'glyphcode@upi',
  upiName: 'Naman',
  upiQrImage: 'media/support/upi-qr-light.png',
  international: { label: 'Buy Me a Coffee', url: 'https://buymeacoffee.com/glyphcode' }
}

const UPI_ID = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$/

export function hasValidUpi(config: SupportConfig): boolean {
  return Boolean(config.upiId && UPI_ID.test(config.upiId) && config.upiName?.trim())
}

export function hasInternational(config: SupportConfig): boolean {
  return Boolean(config.international?.label.trim() && config.international.url.startsWith('https://'))
}

export function supportIsConfigured(config: SupportConfig = support): boolean {
  return hasValidUpi(config) || hasInternational(config)
}

/** A upi:// link that opens the person's UPI app with the payee filled in (amount left to them). */
export function upiLink(config: SupportConfig): string | null {
  if (!hasValidUpi(config)) return null
  const params = new URLSearchParams({ pa: config.upiId!, pn: config.upiName!, cu: 'INR', tn: 'Support Kissa' })
  return `upi://pay?${params.toString()}`
}
