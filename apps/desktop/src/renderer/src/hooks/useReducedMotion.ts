import { useSyncExternalStore } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'

/**
 * One reduced-motion answer for the whole app: true when Settings > General > Comfort asks for it
 * or Windows does (Animation effects off). Replaces framer-motion's own hook, which follows Windows
 * only. App.tsx mirrors it to `data-reduce-motion` on <html> for CSS.
 */
const QUERY = '(prefers-reduced-motion: reduce)'

const media = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null

const subscribeSystem = (cb: () => void): (() => void) => {
  const q = media()
  q?.addEventListener?.('change', cb)
  return () => q?.removeEventListener?.('change', cb)
}

/** Whether Windows asks for reduced motion. */
export const systemReducedMotion = (): boolean => Boolean(media()?.matches)

export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribeSystem, systemReducedMotion, () => false)
}

export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion()
  const pref = usePlayerStore((s) => s.motionPref)
  return pref === 'reduced' || system
}

/** The same answer outside React (render loops, one-off checks). */
export function prefersReducedMotion(): boolean {
  return usePlayerStore.getState().motionPref === 'reduced' || systemReducedMotion()
}

const CONTRAST_QUERY = '(prefers-contrast: more)'
const contrastMedia = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(CONTRAST_QUERY) : null
const subscribeContrast = (cb: () => void): (() => void) => {
  const q = contrastMedia()
  q?.addEventListener?.('change', cb)
  return () => q?.removeEventListener?.('change', cb)
}

/** Whether Windows asks for more contrast. */
export function useSystemMoreContrast(): boolean {
  return useSyncExternalStore(subscribeContrast, () => Boolean(contrastMedia()?.matches), () => false)
}

/** More contrast, from Settings > General > Comfort or Windows. */
export function useMoreContrast(): boolean {
  const system = useSystemMoreContrast()
  const pref = usePlayerStore((s) => s.contrastPref)
  return pref === 'more' || system
}

/** The same answer outside React. */
export function prefersMoreContrast(): boolean {
  return usePlayerStore.getState().contrastPref === 'more' || Boolean(contrastMedia()?.matches)
}
