import { useEffect, useState } from 'react'

/** Whether the app window can be seen (not minimised, not hidden in the tray). */
export function useWindowVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const onDoc = (): void => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onDoc)
    // Minimising or hiding to the tray does not change document.hidden on Windows; the main
    // process says so instead.
    const off = window.electron?.onWindowVisibility?.((v) => setVisible(v && !document.hidden))
    return () => {
      document.removeEventListener('visibilitychange', onDoc)
      off?.()
    }
  }, [])
  return visible
}
