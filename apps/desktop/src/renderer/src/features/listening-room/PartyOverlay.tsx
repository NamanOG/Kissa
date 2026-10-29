import { memo, useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { FullscreenControls } from './FullscreenControls'
import { FullscreenProgress } from './FullscreenProgress'
import { useAutoHide } from './useAutoHide'

/**
 * Party mode's only chrome: the home screen fills the TV with no sidebar or dock, and the
 * fullscreen controls come up when the mouse moves or a key is pressed, then fade away again
 * (with the pointer) after a few quiet seconds.
 */
export const PartyOverlay = memo((): React.JSX.Element => {
  const { isVisible, handlePointerMove, setHold } = useAutoHide()
  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)

  useEffect(() => {
    // The controls ignore the pointer while hidden, so listen on the window.
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerMove)
    }
  }, [handlePointerMove])

  useEffect(() => {
    document.documentElement.classList.toggle('kissa-cursor-hidden', !isVisible)
    return () => document.documentElement.classList.remove('kissa-cursor-hidden')
  }, [isVisible])

  return (
    <>
      <FullscreenProgress />
      <FullscreenControls
        isVisible={isVisible}
        onHold={setHold}
        showLyrics={false}
        onToggleLyrics={toggleSideLyrics}
        canShowLyrics
        lyricsPressed={showSideLyrics}
      />
    </>
  )
})

PartyOverlay.displayName = 'PartyOverlay'
