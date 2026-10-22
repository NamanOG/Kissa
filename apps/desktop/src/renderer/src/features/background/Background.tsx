import { memo, useEffect } from 'react'
import { GradientLayer } from './GradientLayer'
import { VignetteLayer } from './VignetteLayer'

/*
 * There is deliberately no grain layer. The old one tiled a constant mid-grey noise with
 * `mix-blend-overlay`, and overlay with 50% grey returns the colour underneath: screenshots
 * with and without it differed by at most 2/255. As its own full-window GPU layer it was
 * re-blended every frame while the record turned, the largest single rendering cost on the
 * Deck (4.3.1 measurements in docs/PROJECT_STATE.md).
 */
export const Background = memo(() => {
  // Decorative animation (the Support glow) stops while the window is hidden, minimised or in
  // the tray. Windows does not report minimise through document.hidden, so the main process
  // says so too.
  useEffect(() => {
    let windowVisible = true
    const sync = (): void => {
      if (document.hidden || !windowVisible) document.documentElement.setAttribute('data-window-hidden', '')
      else document.documentElement.removeAttribute('data-window-hidden')
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    const off = window.electron?.onWindowVisibility?.((v) => {
      windowVisible = v
      sync()
    })
    return () => {
      document.removeEventListener('visibilitychange', sync)
      off?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 w-screen h-screen -z-50 overflow-hidden bg-transparent">
      <GradientLayer />
      <VignetteLayer />
      <div 
        className="absolute inset-0 pointer-events-none bg-black transition-opacity duration-75 z-10"
        style={{ opacity: 'calc(1 - var(--room-illumination, 1))' }} 
      />
    </div>
  )
})

Background.displayName = 'Background'
