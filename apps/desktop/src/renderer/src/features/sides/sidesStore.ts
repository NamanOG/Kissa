import { create } from 'zustand'
import type { SidePlace, Sides } from './sides'

export interface SidesState {
  /** The album these sides belong to (artist|album, lower case). */
  albumKey: string | null
  sides: Sides | null
  place: SidePlace | null
  /** True while the record is being turned over: the arm is up and the record flips. */
  flipping: boolean
  /** Counts flips, so the deck can start one animation for each. */
  flipCount: number
  /** The letter printed on the label: during a flip, the old side until the record is over. */
  shownLetter: string | null
  /** The sleeve beside the deck is turned over, showing the track list on its back. */
  sleeveTurned: boolean
  /**
   * Where the track list stands for the album playing: 'off' when Sides is turned off in
   * Settings, 'finding' while it is looked up, 'found' or 'missing' once there is an answer.
   */
  lookup: 'off' | 'finding' | 'found' | 'missing'
}

export const FLIP_MS = 2600

export const useSidesStore = create<SidesState>(() => ({
  albumKey: null,
  sides: null,
  place: null,
  flipping: false,
  flipCount: 0,
  shownLetter: null,
  sleeveTurned: false,
  lookup: 'off'
}))

/** The letter of the side playing. */
export function currentLetter(s: Pick<SidesState, 'sides' | 'place'>): string | null {
  if (!s.sides || !s.place) return null
  return s.sides.sides[s.place.side]?.letter ?? null
}
