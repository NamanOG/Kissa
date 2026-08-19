import { useEffect } from 'react'
import { usePlayerStore, AppTheme } from '@renderer/stores/playerStore'

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

      const store = usePlayerStore.getState()

      // If a modal is open, we only want to process Escape, and ignore media shortcuts
      if (store.isOnboardingOpen || store.isSettingsOpen || store.isKeyboardHelpOpen) {
        if (e.key === 'Escape') {
          if (store.isSettingsOpen) store.setIsSettingsOpen(false)
          if (store.isOnboardingOpen) store.setIsOnboardingOpen(false)
          if (store.isKeyboardHelpOpen) store.toggleKeyboardHelp()
        }
        return
      }

      switch (e.key) {
        case ' ': {
          e.preventDefault() // prevent page scroll
          store.togglePlayPause()
          if (store.currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
            window.__kissaMediaCommandCooldown?.()
            window.electron.mediaPlayPause()
          }
          break
        }
        case 'l':
        case 'L': {
          if (store.activeView === 'lyrics') {
            store.setActiveView('deck')
          } else {
            store.toggleSideLyrics()
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (e.shiftKey) {
            store.setProgress((p) => Math.max(0, p - 5))
          } else if (store.currentTrack?.sourceAppId && window.electron?.mediaPrev) {
            window.electron.mediaPrev()
          } else {
            store.setProgress((p) => Math.max(0, p - 5))
          }
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (e.shiftKey) {
            store.setProgress((p) => p + 5)
          } else if (store.currentTrack?.sourceAppId && window.electron?.mediaNext) {
            window.electron.mediaNext()
          } else {
            store.setProgress((p) => p + 5)
          }
          break
        }
        case 'ArrowUp': {
          e.preventDefault() // prevent scroll
          store.setVolume(Math.min(100, store.volume + 5))
          break
        }
        case 'ArrowDown': {
          e.preventDefault() // prevent scroll
          store.setVolume(Math.max(0, store.volume - 5))
          break
        }
        case 't':
        case 'T': {
          const currentIndex = THEMES.indexOf(store.theme)
          const nextIndex = (currentIndex + 1) % THEMES.length
          store.setTheme(THEMES[nextIndex])
          break
        }
        case 's':
        case 'S': {
          store.toggleSettings()
          break
        }
        case '?': {
          // If a modifier is held, it might be shift+/, so we can just check e.key === '?'
          store.toggleKeyboardHelp()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
