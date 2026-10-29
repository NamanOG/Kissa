import {
  usePlayerStore,
  VINYL_COLORS,
  type AppTheme,
  type VinylColor
} from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import { VINYL_PRESSINGS, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import {
  DECK_FINISHES,
  FINISH_PALETTES,
  type DeckFinish
} from '@renderer/features/editions/editions'
import { tl, useLanguageStore } from '@renderer/i18n'
import type { RemoteLook, RemoteLookChange } from '../../../../types/remote'

/** Sleep timer lengths the phone offers, in minutes (0 switches it off). */
export const REMOTE_SLEEP_MINUTES = [0, 15, 30, 60, 90]

const ADAPTIVE_SWATCH = 'conic-gradient(from 200deg, #e08e45, #6b5bd6, #3f8f7a, #e08e45)'

/** How the room looks now, with the choices the phone may offer, in Kissa's language. */
export function lookSnapshot(): RemoteLook {
  const player = usePlayerStore.getState()
  const endsAt = useSleepStore.getState().endsAt
  const adaptive = LISTENING_ENVIRONMENTS.find((e) => e.id === 'adaptive')
  return {
    lang: useLanguageStore.getState().language,
    room: player.theme,
    rooms: [
      ...(adaptive
        ? [{ id: adaptive.id, name: tl('turntable.match'), swatch: ADAPTIVE_SWATCH }]
        : []),
      ...LISTENING_ENVIRONMENTS.filter((e) => e.id !== 'adaptive').map((e) => ({
        id: e.id,
        name: e.name,
        swatch: `radial-gradient(circle at 35% 30%, ${e.accentColor}, ${e.surfaceColor} 78%)`
      }))
    ],
    pressing: player.vinylColor,
    pressings: VINYL_COLORS.map((c) => ({
      id: c,
      name: VINYL_PRESSINGS[c].name,
      swatch: pressingSwatch(c)
    })),
    finish: useEditionsStore.getState().finish,
    finishes: DECK_FINISHES.map((f) => ({ id: f, name: FINISH_PALETTES[f].name })),
    light: Math.round(player.illuminationLevel),
    lyrics: player.showSideLyrics,
    sleepLeft: endsAt === null ? null : Math.max(0, Math.round((endsAt - Date.now()) / 1000))
  }
}

/** Applies a phone's change through the same store actions the window's own controls use. */
export function applyLook(change: RemoteLookChange): void {
  const player = usePlayerStore.getState()
  switch (change.setting) {
    case 'room':
      if (LISTENING_ENVIRONMENTS.some((e) => e.id === change.value))
        player.setTheme(change.value as AppTheme)
      return
    case 'pressing':
      if ((VINYL_COLORS as string[]).includes(change.value))
        player.setVinylColor(change.value as VinylColor)
      return
    case 'finish':
      if ((DECK_FINISHES as string[]).includes(change.value))
        useEditionsStore.getState().setFinish(change.value as DeckFinish)
      return
    case 'light':
      player.setIlluminationLevel(Math.max(0, Math.min(100, change.value)))
      return
    case 'lyrics':
      player.setShowSideLyrics(change.value)
      return
    case 'sleep':
      if (!REMOTE_SLEEP_MINUTES.includes(change.value)) return
      if (change.value === 0) useSleepStore.getState().cancel()
      else useSleepStore.getState().start(change.value)
  }
}

/** Calls back when anything the phone shows about the room may have changed. */
export function subscribeLook(callback: () => void): () => void {
  const offs = [
    usePlayerStore.subscribe(callback),
    useEditionsStore.subscribe(callback),
    useSleepStore.subscribe(callback),
    useLanguageStore.subscribe(callback)
  ]
  return () => offs.forEach((off) => off())
}
