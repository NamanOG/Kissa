import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Full-screen controls that fade away when idle. Moving the pointer or pressing a key brings
 * them back, and they stay while keyboard focus is inside them, so a keyboard user never tabs
 * onto an invisible button.
 */
export function useAutoHide(timeoutMs = 3000) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  const holdRef = useRef(false)

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
    // Any key wakes the controls (Tab, arrows, Space), as the pointer does.
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('keydown', wake)
      clearTimer()
    }
  }, [wake, clearTimer])

  return { isVisible, handlePointerMove: wake, setHold }
}
