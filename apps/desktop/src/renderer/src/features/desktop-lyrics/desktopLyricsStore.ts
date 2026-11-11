import { create } from 'zustand'
import type { DesktopLyricsSize, DesktopLyricsStatus } from '../../../../types/desktopLyrics'

/**
 * A mirror of the Desktop lyrics settings. The main process owns them (desktop-lyrics.json),
 * because Ctrl+Alt+L and the window's own close button change them without the renderer.
 */
interface DesktopLyricsState {
  status: DesktopLyricsStatus
  /** False outside Electron (tests, the share export page): the toggles are hidden. */
  available: boolean
  setStatus: (status: DesktopLyricsStatus) => void
  change: (change: { enabled?: boolean; locked?: boolean; size?: DesktopLyricsSize }) => void
}

export const useDesktopLyricsStore = create<DesktopLyricsState>((set) => ({
  status: { enabled: false, locked: false, size: 'm', shortcut: false },
  available: typeof window !== 'undefined' && typeof window.electron?.setDesktopLyrics === 'function',
  setStatus: (status) => set({ status }),
  change: (change) => {
    const api = window.electron?.setDesktopLyrics
    if (!api) return
    // Show the choice at once; the main process answers with what it kept.
    set((s) => ({ status: { ...s.status, ...change } }))
    void api(change)
      .then((status) => set({ status }))
      .catch(() => undefined)
  }
}))
