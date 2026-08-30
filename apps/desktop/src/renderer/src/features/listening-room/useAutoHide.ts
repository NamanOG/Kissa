import { useState, useEffect, useCallback, useRef } from 'react'

export function useAutoHide(timeoutMs = 3000) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handlePointerMove = useCallback(() => {
    setIsVisible(true)
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false)
    }, timeoutMs)
  }, [clearTimer, timeoutMs])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return { isVisible, handlePointerMove }
}
