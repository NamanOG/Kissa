import { useEffect, useRef } from 'react'

export function useWakeDetection(onWake: () => void) {
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake

  useEffect(() => {
    // We add a tiny delay before attaching listeners so that the click that entered 
    // the display mode doesn't immediately trigger an exit.
    let isAttached = false
    const timeout = setTimeout(() => {
      isAttached = true
    }, 500)

    let initialMousePos: { x: number; y: number } | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (!isAttached) return
      if (!initialMousePos) {
        initialMousePos = { x: e.clientX, y: e.clientY }
        return
      }
      // Require at least 8px of movement to prevent optical mouse micro-jitter / vibrations
      const distance = Math.hypot(e.clientX - initialMousePos.x, e.clientY - initialMousePos.y)
      if (distance > 8) {
        onWakeRef.current()
      }
    }

    const handleImmediateWake = () => {
      if (!isAttached) return
      onWakeRef.current()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAttached) return
      // If pressing L/KeyL (toggle lyrics), T/KeyT (cycle theme), or A/KeyA (toggle match album), handle in-place without waking
      if (
        e.key === 'l' ||
        e.key === 'L' ||
        e.code === 'KeyL' ||
        e.key === 't' ||
        e.key === 'T' ||
        e.code === 'KeyT' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.code === 'KeyA'
      ) {
        return
      }
      onWakeRef.current()
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleImmediateWake, { passive: true })
    window.addEventListener('keydown', handleKeyDown, { passive: true })
    window.addEventListener('touchstart', handleImmediateWake, { passive: true })

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleImmediateWake)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleImmediateWake)
    }
  }, [])
}
