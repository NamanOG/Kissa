import { memo, useEffect, type ReactNode } from 'react'
import { useAnimate } from 'framer-motion'
import { currentLetter, useSidesStore } from './sidesStore'

/**
 * Turns the record over between sides. While the arm goes home (its own animation, driven by
 * `flipping`), the record lifts off the platter, turns about its vertical axis, and the label's
 * letter changes when the record is edge-on, then it settles back down.
 */
export const RecordFlip = memo(({ children }: { children: ReactNode }) => {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const flipCount = useSidesStore((s) => s.flipCount)

  useEffect(() => {
    if (!flipCount || !scope.current) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      useSidesStore.setState((s) => ({ shownLetter: currentLetter(s) }))
      return
    }
    let cancelled = false
    const run = async (): Promise<void> => {
      const ease = [0.45, 0, 0.2, 1] as const
      // Wait for the arm to clear the record.
      await animate(scope.current, { scale: 1 }, { duration: 0.85 })
      if (cancelled) return
      await animate(scope.current, { scale: 1.035, y: '-1.2%' }, { duration: 0.35, ease })
      if (cancelled) return
      await animate(scope.current, { rotateY: 90 }, { duration: 0.42, ease: [0.5, 0, 0.9, 0.6] })
      if (cancelled) return
      useSidesStore.setState((s) => ({ shownLetter: currentLetter(s) }))
      await animate(scope.current, { rotateY: [-90, 0] }, { duration: 0.42, ease: [0.1, 0.4, 0.5, 1] })
      if (cancelled) return
      await animate(scope.current, { scale: 1, y: '0%' }, { duration: 0.4, ease })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [flipCount, animate, scope])

  return (
    <div ref={scope} className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  )
})

RecordFlip.displayName = 'RecordFlip'
