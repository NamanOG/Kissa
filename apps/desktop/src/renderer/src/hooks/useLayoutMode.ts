import { useEffect, useState } from 'react'

/** Below this width the window uses the compact deck: top navigation, turntable above the words. */
export const COMPACT_MAX_WIDTH = 899
/** Below this height (in compact mode) the turntable sits beside the words instead. */
export const SHORT_MAX_HEIGHT = 599

export interface LayoutMode {
  /** Narrow window, for example a Snap half of a laptop screen. */
  compact: boolean
  /** Compact and also short: instrument and words side by side. */
  short: boolean
}

function query(q: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches
}

/**
 * The window's layout class, following the same thresholds as the CSS. Read from media
 * queries so it changes only when a threshold is crossed, never on every resize step.
 */
export function useLayoutMode(): LayoutMode {
  const compactQ = `(max-width: ${COMPACT_MAX_WIDTH}px)`
  const shortQ = `(max-height: ${SHORT_MAX_HEIGHT}px)`
  const [mode, setMode] = useState<LayoutMode>(() => {
    const compact = query(compactQ)
    return { compact, short: compact && query(shortQ) }
  })

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const a = window.matchMedia(compactQ)
    const b = window.matchMedia(shortQ)
    const update = (): void => {
      const compact = a.matches
      const short = compact && b.matches
      setMode((m) => (m.compact === compact && m.short === short ? m : { compact, short }))
    }
    update()
    a.addEventListener('change', update)
    b.addEventListener('change', update)
    return () => {
      a.removeEventListener('change', update)
      b.removeEventListener('change', update)
    }
  }, [compactQ, shortQ])

  return mode
}
