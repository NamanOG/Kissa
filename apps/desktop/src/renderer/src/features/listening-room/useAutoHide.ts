import { useState, useEffect, useCallback, useRef } from 'react'

/** A real hand on the mouse moves further than this; a resting or jittering one does not. */
export const WAKE_DISTANCE_PX = 6

type PointerLike = { clientX: number; clientY: number; type?: string }

/**
 * Full-screen controls that fade away when idle (fullscreen and Party mode).
 *
 * Only the pointer brings them back: a real move (more than a few pixels, so a resting mouse's
 * jitter does not count) or a click. Shortcut and media keys (Space, arrows, L, P...) act without
 * revealing anything. Tab and Shift+Tab do reveal them, and they stay while keyboard focus is
 * inside them (setHold), so a keyboard user never tabs onto an invisible button.
 */
export function useAutoHide(timeoutMs = 3000) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  const holdRef = useRef(false)
  const anchorRef = useRef<{ x: number; y: number } | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const wake = useCallback(() => {
    setIsVisible(true)
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      if (!holdRef.current) setIsVisible(false)
    }, timeoutMs)
  }, [clearTimer, timeoutMs])

  /**
   * Pointer activity. Called without an event it simply wakes. A press always wakes; a move
   * wakes only once the pointer has travelled past WAKE_DISTANCE_PX from where it was last seen
   * at rest.
   */
  const handlePointerMove = useCallback(
    (event?: PointerLike) => {
      if (!event || typeof event.clientX !== 'number') {
        wake()
        return
      }
      const here = { x: event.clientX, y: event.clientY }
      if (event.type === 'pointerdown' || event.type === 'mousedown') {
        anchorRef.current = here
        wake()
        return
      }
      const anchor = anchorRef.current
      if (!anchor) {
        anchorRef.current = here
        return
      }
      if (Math.hypot(here.x - anchor.x, here.y - anchor.y) > WAKE_DISTANCE_PX) {
        anchorRef.current = here
        wake()
      }
    },
    [wake]
  )

  /** Keep the controls up while focus is inside them; release starts the idle timer again. */
  const setHold = useCallback(
    (hold: boolean) => {
      holdRef.current = hold
      if (hold) {
        clearTimer()
        setIsVisible(true)
      } else {
        wake()
      }
    },
    [clearTimer, wake]
  )

  useEffect(() => {
    // Of the keys, only Tab (and Shift+Tab) reveals the controls: it is how a keyboard user
    // reaches them. Every other key is a shortcut and acts with the controls left hidden.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') wake()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimer()
    }
  }, [wake, clearTimer])

  return { isVisible, handlePointerMove, setHold }
}
