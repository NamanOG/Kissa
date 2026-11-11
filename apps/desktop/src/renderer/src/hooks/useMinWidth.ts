import { useEffect, useState } from 'react'

function matches(px: number): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(`(min-width: ${px}px)`).matches
    : false
}

/**
 * Whether the window is at least `px` CSS pixels wide. Read again after mount and on every
 * resize, so a change between the first render and the listener (the first run opens and then
 * maximizes the window) is never missed.
 */
export function useMinWidth(px: number): boolean {
  const [wide, setWide] = useState(() => matches(px))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(`(min-width: ${px}px)`)
    const update = (): void => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [px])
  return wide
}
