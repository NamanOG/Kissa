import { create } from 'zustand'
import { WEARS, type RecordWear } from './vinylSound'

const ON_KEY = 'kissa_vinyl_sound'
const WEAR_KEY = 'kissa_vinyl_wear'

function read<T>(key: string, parse: (v: string) => T | null, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return (v === null ? null : parse(v)) ?? fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not saved; applies for this session.
  }
}

export type EngineStatus = 'idle' | 'live' | 'unavailable'

interface HifiState {
  /** Albums from the PC play through the vinyl sound. */
  on: boolean
  wear: RecordWear
  /** True while the listener holds Compare to hear the clean file. */
  comparing: boolean
  /** 'unavailable' when this PC's audio could not be routed through the engine. */
  status: EngineStatus
  setOn: (on: boolean) => void
  setWear: (wear: RecordWear) => void
  setComparing: (comparing: boolean) => void
  setStatus: (status: EngineStatus) => void
}

export const useHifiStore = create<HifiState>((set) => ({
  on: read(ON_KEY, (v) => v === 'true', true as boolean),
  wear: read(
    WEAR_KEY,
    (v) => (WEARS.includes(v as RecordWear) ? (v as RecordWear) : null),
    'played'
  ),
  comparing: false,
  status: 'idle',
  setOn: (on) => {
    save(ON_KEY, String(on))
    set({ on, comparing: false })
  },
  setWear: (wear) => {
    save(WEAR_KEY, wear)
    set({ wear })
  },
  setComparing: (comparing) => set({ comparing }),
  setStatus: (status) => set({ status })
}))
