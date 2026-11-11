import { useEffect, useRef, type RefObject } from 'react'

/**
 * When a popover closes, keyboard focus goes back to the button that opened it, if it would
 * otherwise be lost (the panel that held it has gone and focus fell to the page). A close by
 * clicking somewhere else that takes focus leaves focus there.
 */
export function useReturnFocus(open: boolean, opener: RefObject<HTMLElement | null>): void {
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) {
      const active = document.activeElement
      if (!active || active === document.body) opener.current?.focus({ preventScroll: true })
    }
    wasOpen.current = open
  }, [open, opener])
}
