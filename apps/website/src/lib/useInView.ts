import { useEffect, useRef, useState } from 'react'

/** True while the element is near the viewport, so loops and canvases rest when off screen. */
export function useInView<T extends Element>(margin = '120px 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [margin])

  return [ref, inView] as const
}
