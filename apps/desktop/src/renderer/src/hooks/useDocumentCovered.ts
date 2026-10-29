import { useEffect, useState } from 'react'

const ATTR = 'data-kissa-cover'

/**
 * Whether a full-window story (Pressed) covers the app: it sets `data-kissa-cover` on <html>
 * once it has faded in and removes it as it starts to close (see PressedView and main.css).
 */
export function useDocumentCovered(): boolean {
  const [covered, setCovered] = useState(() => document.documentElement.hasAttribute(ATTR))
  useEffect(() => {
    const root = document.documentElement
    const sync = (): void => setCovered(root.hasAttribute(ATTR))
    sync()
    if (typeof MutationObserver !== 'function') return
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: [ATTR] })
    return () => observer.disconnect()
  }, [])
  return covered
}
