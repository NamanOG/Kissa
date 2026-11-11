import { useEffect } from 'react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { openSheets } from '@renderer/features/background/sheetCount'

const THEMES: AppTheme[] = [
  'quiet-room',
  'dusty-record',
  'jazz-bar',
  'midnight-apartment',
  'rainy-window',
  'hifi-library',
  'concrete-vinyl',
  'sunday-morning',
  'adaptive'
]

const REGIONS = ['rail', 'page', 'dock'] as const
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Moves focus to the first control of the next (or previous) region that is on screen: the side
 * rail, the page and the dock. Regions that are inert or not rendered are skipped.
 */
export function moveBetweenRegions(step: 1 | -1): void {
  const present = REGIONS.map((r) => document.querySelector<HTMLElement>(`[data-region="${r}"]`)).filter(
    (el): el is HTMLElement => Boolean(el) && !el!.closest('[inert]') && el!.getClientRects().length > 0
  )
  if (present.length === 0) return
  const active = document.activeElement
  const at = present.findIndex((el) => el.contains(active))
  const start = at < 0 ? (step > 0 ? -1 : 0) : at
  for (let k = 1; k <= present.length; k++) {
    const region = present[(start + step * k + present.length * 2) % present.length]
    const target = [...region.querySelectorAll<HTMLElement>(FOCUSABLE)].find((el) => el.getClientRects().length > 0 && !el.closest('[inert],[aria-hidden="true"]'))
    if (target) {
      target.focus()
      return
    }
  }
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const store = usePlayerStore.getState()
      if (document.querySelector('dialog[open], [data-kissa-overlay]')) return

      // F6 / Shift+F6: from the side rail to the page to the dock and round (not while a sheet is open).
      if (e.key === 'F6' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (openSheets() > 0) return
        e.preventDefault()
        moveBetweenRegions(e.shiftKey ? -1 : 1)
        return
      }

      if (e.key === 'F11' || e.code === 'F11') {
        e.preventDefault()
        e.stopPropagation()
        store.toggleFullscreen()
        return
      }

      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return
      }

      // Escape: Close open modals first, or exit screensaver / Listening Display / fullscreen
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (store.isSettingsOpen || store.isOnboardingOpen || store.isKeyboardHelpOpen) {
          e.preventDefault()
          if (store.isSettingsOpen) store.setIsSettingsOpen(false)
          if (store.isOnboardingOpen) store.setIsOnboardingOpen(false)
          if (store.isKeyboardHelpOpen) store.toggleKeyboardHelp()
          return
        }
        if (window.electron?.exitScreensaver) {
          window.electron.exitScreensaver()
        }
        if (store.isListeningDisplay) {
          e.preventDefault()
          store.setIsListeningDisplay(false)
          return
        }
        if (store.isFullscreen) {
          e.preventDefault()
          store.setFullscreen(false)
          return
        }
      }

      // P: party mode, the home screen full screen with nothing around it (for a TV).
      if (
        (e.key === 'p' || e.key === 'P' || e.code === 'KeyP') &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !store.isScreensaver &&
        !store.isSettingsOpen &&
        !store.isOnboardingOpen &&
        !store.isKeyboardHelpOpen
      ) {
        if (e.repeat) return
        e.preventDefault()
        store.togglePartyMode()
        return
      }

      if (
        (e.key === 'd' || e.key === 'D' || e.code === 'KeyD') &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        if (e.repeat) return
        e.preventDefault()
        e.stopPropagation()
        if (store.isSettingsOpen) store.setIsSettingsOpen(false)
        if (store.isOnboardingOpen) store.setIsOnboardingOpen(false)
        if (store.isKeyboardHelpOpen) store.toggleKeyboardHelp()

        if (store.isListeningDisplay) {
          store.setIsListeningDisplay(false)
        } else {
          store.setIsListeningDisplay(true)
        }
        return
      }

      // If a modal is open, prevent media hotkeys from conflicting (unless in screensaver or listening display mode)
      if (
        !store.isScreensaver &&
        !store.isListeningDisplay &&
        (store.isOnboardingOpen || store.isSettingsOpen || store.isKeyboardHelpOpen)
      ) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          store.toggleSettings()
          return
        }
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          e.preventDefault()
          store.toggleKeyboardHelp()
          return
        }
        return
      }

      if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') {
        // A focused control (the play button, the Start/Stop key, a switch, a slider) answers Space
        // itself. Toggling here as well sent two play/pauses for one press, 170 ms apart (keydown,
        // then the control's own key-up), so the music stopped again at once (live log, 11-10).
        if (
          target?.closest(
            'button, a[href], summary, [role="button"], [role="switch"], [role="slider"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="option"]'
          )
        ) {
          return
        }
        // Held keys repeat, and synthetic events are not the listener: neither may toggle playback.
        if (e.repeat || !e.isTrusted) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        store.togglePlayPause()
        if (window.electron?.mediaPlayPause) {
          window.__kissaMediaCommandCooldown?.()
          window.electron.mediaPlayPause()
        }
        return
      }

      if (e.key === 'l' || e.key === 'L' || e.code === 'KeyL') {
        e.preventDefault()
        if (store.isListeningDisplay || store.isScreensaver) {
          store.toggleScreensaverLyrics()
        } else if (store.activeView === 'lyrics') {
          store.setActiveView('deck')
        } else {
          store.toggleSideLyrics()
        }
        return
      }

      if (e.key === 'm' || e.key === 'M' || e.code === 'KeyM') {
        e.preventDefault()
        if (store.volume > 0) {
          store.setVolume(0)
        } else {
          store.setVolume(78)
        }
        return
      }

      if (e.key === 't' || e.key === 'T' || e.code === 'KeyT') {
        e.preventDefault()
        const currentIndex = THEMES.indexOf(store.theme)
        const nextIndex = (currentIndex + 1) % THEMES.length
        store.setTheme(THEMES[nextIndex])
        return
      }

      if (e.key === 'a' || e.key === 'A' || e.code === 'KeyA') {
        e.preventDefault()
        if (store.theme === 'adaptive') {
          store.setTheme(store.previousManualTheme || 'quiet-room')
        } else {
          usePlayerStore.setState({ previousManualTheme: store.theme })
          store.setTheme('adaptive')
        }
        return
      }

      if (e.key === 's' || e.key === 'S' || e.code === 'KeyS') {
        e.preventDefault()
        store.toggleSettings()
        return
      }

      if ((e.key === 'e' || e.key === 'E' || e.code === 'KeyE') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (store.isListeningDisplay || store.isScreensaver) return
        e.preventDefault()
        useEditionsStore.getState().showEditor()
        return
      }

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault()
          const isExternal = !!store.currentTrack?.sourceAppId
          if (e.shiftKey) {
            if (isExternal && window.electron?.mediaPrev) {
              window.electron.mediaPrev()
            } else if (!isExternal) {
              store.playPrev()
            }
          } else {
            const current = PlaybackClock.getCurrentTime() || store.progress
            const nextTime = Math.max(0, current - 5)
            store.seek(nextTime)
          }
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const isExternal = !!store.currentTrack?.sourceAppId
          if (e.shiftKey) {
            if (isExternal && window.electron?.mediaNext) {
              window.electron.mediaNext()
            } else if (!isExternal) {
              store.playNext()
            }
          } else {
            const current = PlaybackClock.getCurrentTime() || store.progress
            const duration = store.currentTrack?.duration ?? 0
            let nextTime = current + 5
            if (duration > 0) {
              nextTime = Math.min(nextTime, duration)
            }
            store.seek(nextTime)
          }
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const newVol = Math.min(100, store.volume + 5)
          store.setVolume(newVol)
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const newVol = Math.max(0, store.volume - 5)
          store.setVolume(newVol)
          break
        }

        case '?':
        case '/': {
          e.preventDefault()
          store.toggleKeyboardHelp()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
