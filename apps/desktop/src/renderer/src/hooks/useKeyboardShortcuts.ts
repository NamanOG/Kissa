import { useEffect } from 'react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'

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

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const store = usePlayerStore.getState()

      // F11: Fullscreen always available
      if (e.key === 'F11' || e.code === 'F11') {
        e.preventDefault()
        e.stopPropagation()
        store.toggleFullscreen()
        return
      }

      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return
      }

      // Escape: Close open modals first, or exit Listening Display / fullscreen
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (store.isSettingsOpen || store.isOnboardingOpen || store.isKeyboardHelpOpen) {
          e.preventDefault()
          if (store.isSettingsOpen) store.setIsSettingsOpen(false)
          if (store.isOnboardingOpen) store.setIsOnboardingOpen(false)
          if (store.isKeyboardHelpOpen) store.toggleKeyboardHelp()
          return
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

      // D: Toggle Listening Display
      if ((e.key === 'd' || e.key === 'D' || e.code === 'KeyD') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.repeat) return
        e.preventDefault()
        e.stopPropagation()
        // Close open modals if activating
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

      // If a modal is open, prevent media hotkeys from conflicting
      if (store.isOnboardingOpen || store.isSettingsOpen || store.isKeyboardHelpOpen) {
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

      // Space / Play-Pause
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') {
        e.preventDefault()
        store.togglePlayPause()
        if (window.electron?.mediaPlayPause) {
          window.__kissaMediaCommandCooldown?.()
          window.electron.mediaPlayPause()
        }
        return
      }

      switch (e.key) {
        case 'l':
        case 'L': {
          e.preventDefault()
          if (store.isListeningDisplay) {
            store.toggleScreensaverLyrics()
          } else if (store.activeView === 'lyrics') {
            store.setActiveView('deck')
          } else {
            store.toggleSideLyrics()
          }
          break
        }
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
        case 'm':
        case 'M': {
          e.preventDefault()
          if (store.volume > 0) {
            store.setVolume(0)
          } else {
            store.setVolume(78)
          }
          break
        }
        case 't':
        case 'T': {
          e.preventDefault()
          const currentIndex = THEMES.indexOf(store.theme)
          const nextIndex = (currentIndex + 1) % THEMES.length
          store.setTheme(THEMES[nextIndex])
          break
        }
        case 'a':
        case 'A': {
          e.preventDefault()
          if (store.theme === 'adaptive') {
            store.setTheme(store.previousManualTheme || 'quiet-room')
          } else {
            usePlayerStore.setState({ previousManualTheme: store.theme })
            store.setTheme('adaptive')
          }
          break
        }
        case 's':
        case 'S': {
          e.preventDefault()
          store.toggleSettings()
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
