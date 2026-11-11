// Shared with the website, so the app links only to a page that is actually published.
import { SUPPORT_PAGE_URL as PUBLISHED_URL, support, supportIsConfigured, type SupportConfig } from '../../../../../../../config/support'

/**
 * Where "Support Kissa" leads, or null when there is nowhere to go yet. Kissa stays fully
 * free; this only opens the website's support page, never a payment inside the app.
 *
 * The link appears once the shared support settings hold a valid route (valid UPI details are
 * enough). A local preview build can pass RENDERER_VITE_SUPPORT_URL to show it early.
 */
export function resolveSupportUrl(config: SupportConfig, previewOverride?: string): string | null {
  const override = previewOverride?.trim()
  if (override) return override.startsWith('https://') ? override : null
  return supportIsConfigured(config) ? PUBLISHED_URL : null
}

export const SUPPORT_PAGE_URL: string | null = resolveSupportUrl(
  support,
  import.meta.env.RENDERER_VITE_SUPPORT_URL as string | undefined
)

/** Open the published support page in the browser: never a payment inside the app. */
export function openSupportPage(url: string | null = SUPPORT_PAGE_URL): void {
  if (!url) return
  if (window.electron?.openExternal) void window.electron.openExternal(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}
