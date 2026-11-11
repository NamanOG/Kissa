import { useEffect, useRef } from 'react'

/**
 * Where the record sits, as window fractions (y down). Moving light pools its light there; the
 * renderer eases toward it, so a page change glides the pool instead of jumping.
 */
let src: [number, number] = [0.62, 0.5]
export const setLightSource = (x: number, y: number): void => {
  src = [x, y]
}
export const getLightSource = (): [number, number] => src

/** Marks the element the light gathers around on pages other than the Deck. */
export const LIGHT_SOURCE_ATTR = 'data-light-source'

/**
 * Follows the centre of the element `find` returns (the deck's turntable, the Lyrics page's
 * record) on resize and layout changes only, never per frame. A page that mounts a moment later
 * (after a page transition) is waited for over a few frames. With no element (Shelf, fullscreen,
 * Party, the mini player: find is null), the light pools in the window's centre. Re-runs when
 * `key` changes.
 */
export function useLightSource(find: (() => HTMLElement | null) | null, key: unknown): void {
  const findRef = useRef(find)
  findRef.current = find
  useEffect(() => {
    let raf = 0
    let tries = 0
    let ro: ResizeObserver | null = null
    let el: HTMLElement | null = null
    const place = (): void => {
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width === 0 || window.innerWidth === 0 || window.innerHeight === 0) return
      setLightSource((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight)
    }
    const attach = (): void => {
      el = findRef.current?.() ?? null
      if (!el) {
        // The page may still be mounting behind a transition: wait up to about a second.
        if (findRef.current && ++tries < 60) raf = requestAnimationFrame(attach)
        else setLightSource(0.5, 0.5)
        return
      }
      place()
      ro = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null
      ro?.observe(el)
    }
    setLightSource(0.5, 0.5)
    attach()
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [key])
}
