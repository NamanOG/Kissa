import { create } from 'zustand'
import type { RecapKind } from './recap'

/** Pressed: the listening recap. Which period is open, if any. */
interface PressedState {
  open: boolean
  kind: RecapKind
  /** 0 is the period now, -1 the one before. */
  offset: number
  show: (kind?: RecapKind, offset?: number) => void
  setPeriod: (kind: RecapKind, offset: number) => void
  close: () => void
}

export const usePressedStore = create<PressedState>((set) => ({
  open: false,
  kind: 'month',
  offset: 0,
  show: (kind = 'month', offset = 0) => set({ open: true, kind, offset }),
  setPeriod: (kind, offset) => set({ kind, offset: Math.min(0, offset) }),
  close: () => set({ open: false })
}))
