import { create } from 'zustand'

/** A quiet card above the dock: closing time, the end of a session, a kept lyric line. */
export interface RoomNotice {
  id: string
  title: string
  body?: string
  /** Up to three album covers shown as a small stack. */
  covers?: string[]
  /** Big numbers under the title, e.g. [['42', 'minutes'], ['3', 'albums']]. */
  stats?: [string, string][]
  action?: { label: string; run: () => void }
  /** How long it stays, in ms. */
  duration?: number
}

interface NoticeState {
  notice: RoomNotice | null
  show: (notice: RoomNotice) => void
  dismiss: (id?: string) => void
}

export const useNoticeStore = create<NoticeState>((set, get) => ({
  notice: null,
  show: (notice) => set({ notice }),
  dismiss: (id) => {
    if (id && get().notice?.id !== id) return
    set({ notice: null })
  }
}))
