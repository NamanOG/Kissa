import { create } from 'zustand'

/**
 * Settings for the big update's room features. Each one is saved on its own key so an older
 * Kissa reading the same storage ignores them.
 */
export interface FeaturesState {
  /** A small card in the corner when the song changes while Kissa is hidden. */
  trackToast: boolean
  /** The room's light warms in the evening and cools in the morning, from the clock. */
  followDaylight: boolean
  /** A clear lid lowers over the turntable after a while with nothing playing. */
  dustCover: boolean
  /** At a set hour the room dims and a sleep timer starts. */
  closingTime: boolean
  /** Hour of the day (0-23) closing time begins. */
  closingHour: number
  /** A quiet card that sums up a listening session when the music stops. */
  sessionWrap: boolean
  /** Moving light breathes and flows with the music. */
  soundLight: boolean
  /** Albums play as sides of a record, and the record turns over between them. */
  albumSides: boolean

  setTrackToast: (on: boolean) => void
  setFollowDaylight: (on: boolean) => void
  setDustCover: (on: boolean) => void
  setClosingTime: (on: boolean) => void
  setClosingHour: (hour: number) => void
  setSessionWrap: (on: boolean) => void
  setSoundLight: (on: boolean) => void
  setAlbumSides: (on: boolean) => void
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(key)
    return saved === null ? fallback : saved === 'true'
  } catch {
    return fallback
  }
}

function readHour(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key))
    return localStorage.getItem(key) !== null && Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback
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

export const useFeaturesStore = create<FeaturesState>((set) => ({
  trackToast: readFlag('kissa_track_toast', true),
  followDaylight: readFlag('kissa_follow_daylight', false),
  dustCover: readFlag('kissa_dust_cover', true),
  closingTime: readFlag('kissa_closing_time', false),
  closingHour: readHour('kissa_closing_hour', 23),
  sessionWrap: readFlag('kissa_session_wrap', true),
  soundLight: readFlag('kissa_sound_light', true),
  albumSides: readFlag('kissa_album_sides', true),

  setTrackToast: (on) => {
    save('kissa_track_toast', String(on))
    set({ trackToast: on })
  },
  setFollowDaylight: (on) => {
    save('kissa_follow_daylight', String(on))
    set({ followDaylight: on })
  },
  setDustCover: (on) => {
    save('kissa_dust_cover', String(on))
    set({ dustCover: on })
  },
  setClosingTime: (on) => {
    save('kissa_closing_time', String(on))
    set({ closingTime: on })
  },
  setClosingHour: (hour) => {
    const h = Math.max(0, Math.min(23, Math.round(hour)))
    save('kissa_closing_hour', String(h))
    set({ closingHour: h })
  },
  setSessionWrap: (on) => {
    save('kissa_session_wrap', String(on))
    set({ sessionWrap: on })
  },
  setSoundLight: (on) => {
    save('kissa_sound_light', String(on))
    set({ soundLight: on })
  },
  setAlbumSides: (on) => {
    save('kissa_album_sides', String(on))
    set({ albumSides: on })
  }
}))
