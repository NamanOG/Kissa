import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert],[aria-hidden="true"]')
  )
}

/**
 * Keyboard focus for an overlay that covers the app (Settings, shortcuts, the guide, sharing):
 * on open, focus moves into the overlay (to an element marked `data-autofocus`, else the first
 * control) unless something inside already has it; Tab and Shift+Tab cycle inside it instead of
 * reaching the controls hidden behind; on close, focus returns to whatever opened it.
 * Escape handling stays with each overlay.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const opener = document.activeElement as HTMLElement | null
    // Wait a frame so the overlay (and any entry animation's first frame) is in the DOM.
    const raf = requestAnimationFrame(() => {
      const root = ref.current
      if (!root || root.contains(document.activeElement)) return
      const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(root)[0] ?? root
      if (target === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const root = ref.current
      if (!root) return
      const list = focusables(root)
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const current = document.activeElement as HTMLElement | null
      const inside = current ? root.contains(current) : false
      if (e.shiftKey && (!inside || current === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || current === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true })
    }
  }, [ref, active])
}
