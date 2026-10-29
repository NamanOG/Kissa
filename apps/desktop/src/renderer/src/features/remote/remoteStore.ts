import { create } from 'zustand'
import type { PhoneRemoteStatus } from '../../../../types/remote'

export const REMOTE_OFF: PhoneRemoteStatus = {
  on: false,
  url: null,
  pairUrl: null,
  code: null,
  phones: 0
}

/** The phone remote as the main process reports it. Never saved: each launch starts with it off. */
export const useRemoteStore = create<{
  status: PhoneRemoteStatus
  busy: boolean
  setStatus: (status: PhoneRemoteStatus) => void
  setOn: (on: boolean) => Promise<void>
}>((set) => ({
  status: REMOTE_OFF,
  busy: false,
  setStatus: (status) => set({ status }),
  setOn: async (on) => {
    const api = window.electron?.setPhoneRemoteOn
    if (!api) return
    set({ busy: true })
    try {
      set({ status: await api(on) })
    } finally {
      set({ busy: false })
    }
  }
}))
