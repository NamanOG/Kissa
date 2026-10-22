import React, { memo } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
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

/**
 * A small labelled pill at the top right of the deck. A soft halo in the album's colour
 * breathes slowly behind it (opacity only, on its own tiny layer, so it costs nothing), and
 * stands still under reduced motion or while the window is hidden (.kissa-glow in main.css).
 */
export const SupportKissaLink = memo(({ className }: { className?: string }): React.JSX.Element | null => {
  const url = SUPPORT_PAGE_URL
  if (!url) return null
  const open = (): void => openSupportPage(url)
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'group app-region-no-drag relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-tone/35 px-3.5 py-1.5 text-[12px] font-medium text-ink/85 transition-colors hover:border-tone/60 hover:text-ink',
        'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="kissa-glow pointer-events-none absolute inset-0 -z-10 rounded-full bg-tone/10 shadow-[0_0_18px_2px_var(--accent)]"
      />
      <Heart aria-hidden="true" className="h-3 w-3 fill-tone text-tone" strokeWidth={1.75} />
      Support Kissa
    </button>
  )
})

/** Open the published support page in the browser: never a payment inside the app. */
export function openSupportPage(url: string | null = SUPPORT_PAGE_URL): void {
  if (!url) return
  if (window.electron?.openExternal) void window.electron.openExternal(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}

SupportKissaLink.displayName = 'SupportKissaLink'
