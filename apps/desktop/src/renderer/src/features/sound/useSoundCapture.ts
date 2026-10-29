import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useWindowVisible } from '@renderer/hooks/useWindowVisible'
import { soundListener } from './soundListener'

/**
 * Listens while the Moving light follows the music. Stops when the music pauses, the window is
 * hidden, or either setting is off.
 */
export function useSoundCapture(): void {
  const light = useFeaturesStore((s) => s.soundLight)
  const movingLight = usePlayerStore((s) => s.theme === 'adaptive' && s.ambientMotion)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const mini = usePlayerStore((s) => s.isMiniPlayer)
  const visible = useWindowVisible()
  const wanted = light && movingLight && isPlaying && visible && !mini

  useEffect(() => {
    if (!wanted) return
    return soundListener.acquire()
  }, [wanted])
}
