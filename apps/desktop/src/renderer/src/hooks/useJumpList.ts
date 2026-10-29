import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useT } from '../i18n'

/** Opens the part of Kissa a taskbar jump-list task names. */
export function openJumpPlace(place: string): void {
  const store = usePlayerStore.getState()
  if (store.isScreensaver) return
  if (place === 'mini') {
    if (!store.isMiniPlayer) store.toggleMiniPlayer()
    return
  }
  if (store.isMiniPlayer) store.toggleMiniPlayer()
  if (store.isListeningDisplay) store.setIsListeningDisplay(false)
  if (place === 'lyrics') store.setActiveView('lyrics')
  else if (place === 'shelf') store.setActiveView('shelf')
  else if (place === 'focus') store.setActiveView('study')
}

/** Keeps the taskbar jump list in the listener's language and opens the task Kissa started with. */
export function useJumpList(): void {
  const t = useT()
  useEffect(() => {
    void window.electron?.setJumpList?.({
      lyrics: t('nav.lyrics'),
      shelf: t('nav.shelf'),
      focus: t('jump.focus'),
      mini: t('nav.mini')
    })
  }, [t])

  useEffect(() => {
    let alive = true
    void window.electron?.takeJumpPlace?.().then((place) => {
      if (alive && place) openJumpPlace(place)
    })
    return () => {
      alive = false
    }
  }, [])
}
