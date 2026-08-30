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
  'sunday-morning'
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

      // Escape: Close open modals first, or exit fullscreen
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (store.isSettingsOpen || store.isOnboardingOpen || store.isKeyboardHelpOpen) {
          e.preventDefault()
          if (store.isSettingsOpen) store.setIsSettingsOpen(false)
          if (store.isOnboardingOpen) store.setIsOnboardingOpen(false)
          if (store.isKeyboardHelpOpen) store.toggleKeyboardHelp()
          return
        }
        if (store.isFullscreen) {
          e.preventDefault()
          store.setFullscreen(false)
          return
        }
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
          if (store.activeView === 'lyrics') {
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
              store.setProgress((p) => Math.max(0, p - 5))
              PlaybackClock.setSeekPosition(Math.max(0, (PlaybackClock.getCurrentTime() || store.progress) - 5))
            }
          } else if (isExternal && window.electron?.mediaPrev) {
            window.electron.mediaPrev()
          } else if (!isExternal) {
            store.setProgress((p) => Math.max(0, p - 5))
            PlaybackClock.setSeekPosition(Math.max(0, (PlaybackClock.getCurrentTime() || store.progress) - 5))
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
              store.setProgress((p) => p + 5)
              PlaybackClock.setSeekPosition((PlaybackClock.getCurrentTime() || store.progress) + 5)
            }
          } else if (isExternal && window.electron?.mediaNext) {
            window.electron.mediaNext()
          } else if (!isExternal) {
            store.setProgress((p) => p + 5)
            PlaybackClock.setSeekPosition((PlaybackClock.getCurrentTime() || store.progress) + 5)
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
