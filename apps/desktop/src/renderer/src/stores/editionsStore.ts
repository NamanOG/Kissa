import { create } from 'zustand'
import { APP_THEMES, VINYL_COLORS, usePlayerStore } from './playerStore'
import {
  DECK_FINISHES,
  EDITIONS_KEY,
  MAX_EDITIONS,
  MAX_EDITION_NAME,
  newEditionId,
  sanitizeEditions,
  type DeckFinish,
  type Edition
} from '@renderer/features/editions/editions'

const FINISH_KEY = 'kissa_deck_finish'

function readFinish(): DeckFinish {
  try {
    const saved = localStorage.getItem(FINISH_KEY)
    return DECK_FINISHES.includes(saved as DeckFinish) ? (saved as DeckFinish) : 'original'
  } catch {
    return 'original'
  }
}

function readEditions(): Edition[] {
  try {
    const raw = localStorage.getItem(EDITIONS_KEY)
    return raw ? sanitizeEditions(JSON.parse(raw), { pressings: VINYL_COLORS, themes: APP_THEMES }) : []
  } catch {
    return []
  }
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
}

/** What the editor restores on Cancel. */
interface Look {
  finish: DeckFinish
  pressing: Edition['pressing']
  theme: Edition['theme']
}

interface EditionsState {
  finish: DeckFinish
  editions: Edition[]
  isEditorOpen: boolean
  /** The look when the editor opened, restored by Cancel. */
  openedWith: Look | null

  setFinish: (finish: DeckFinish) => void
  openEditor: () => void
  /** Bring the editor up beside the deck from anywhere: closes Settings, shows the Deck. */
  showEditor: () => void
  /** Keep what is on the deck now. */
  closeEditor: () => void
  /** Put back the look from when the editor opened. */
  cancelEditor: () => void
  /** Original finish and the classic black pressing; the room stays as it is. */
  resetToOriginal: () => void
  saveEdition: (name: string) => Edition | null
  applyEdition: (id: string) => void
  deleteEdition: (id: string) => void
}

const currentLook = (finish: DeckFinish): Look => {
  const p = usePlayerStore.getState()
  return { finish, pressing: p.vinylColor, theme: p.theme }
}

export const useEditionsStore = create<EditionsState>((set, get) => ({
  finish: readFinish(),
  editions: readEditions(),
  isEditorOpen: false,
  openedWith: null,

  setFinish: (finish) => {
    if (!DECK_FINISHES.includes(finish)) return
    persist(FINISH_KEY, finish)
    set({ finish })
  },

  openEditor: () => set({ isEditorOpen: true, openedWith: currentLook(get().finish) }),

  showEditor: () => {
    // The editor sits beside the deck so every choice shows on the real turntable.
    const player = usePlayerStore.getState()
    if (player.isSettingsOpen) player.setIsSettingsOpen(false)
    if (player.activeView !== 'deck') player.setActiveView('deck')
    if (!get().isEditorOpen) get().openEditor()
  },

  closeEditor: () => set({ isEditorOpen: false, openedWith: null }),

  cancelEditor: () => {
    const look = get().openedWith
    if (look) {
      get().setFinish(look.finish)
      const p = usePlayerStore.getState()
      if (p.vinylColor !== look.pressing) p.setVinylColor(look.pressing)
      if (p.theme !== look.theme) p.setTheme(look.theme)
    }
    set({ isEditorOpen: false, openedWith: null })
  },

  resetToOriginal: () => {
    get().setFinish('original')
    usePlayerStore.getState().setVinylColor('black')
  },

  saveEdition: (rawName) => {
    const name = rawName.replace(/\s+/g, ' ').trim().slice(0, MAX_EDITION_NAME)
    if (!name) return null
    const look = currentLook(get().finish)
    const existing = get().editions.find((e) => e.name.toLowerCase() === name.toLowerCase())
    const edition: Edition = { id: existing?.id ?? newEditionId(), name, ...look }
    const others = get().editions.filter((e) => e.id !== edition.id)
    // A same-named setup is updated in place; new ones go first, oldest dropped past the cap.
    const editions = existing
      ? get().editions.map((e) => (e.id === edition.id ? edition : e))
      : [edition, ...others].slice(0, MAX_EDITIONS)
    persist(EDITIONS_KEY, JSON.stringify(editions))
    set({ editions })
    return edition
  },

  applyEdition: (id) => {
    const edition = get().editions.find((e) => e.id === id)
    if (!edition) return
    get().setFinish(edition.finish)
    const p = usePlayerStore.getState()
    p.setVinylColor(edition.pressing)
    if (p.theme !== edition.theme) p.setTheme(edition.theme)
  },

  deleteEdition: (id) => {
    const editions = get().editions.filter((e) => e.id !== id)
    persist(EDITIONS_KEY, JSON.stringify(editions))
    set({ editions })
  }
}))
