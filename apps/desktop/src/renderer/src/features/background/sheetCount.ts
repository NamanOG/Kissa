import { useEffect, useSyncExternalStore } from 'react'

/**
 * How many full sheets (Settings, Share, the guide, What's new, keyboard help) are open. While
 * one is, Moving light settles to a still frame: calmer, and the sheet's glass blur is not
 * recomputed for every frame of a moving room. Popovers, tooltips and reminder cards do not count.
 */
let n = 0
const listeners = new Set<() => void>()
const notify = (): void => listeners.forEach((l) => l())

/** Marks a sheet as open; returns the release. Releasing twice is harmless. */
export function sheetOpened(): () => void {
  n += 1
  document.documentElement.dataset.kissaSheet = ''
  if (n === 1) notify()
  let released = false
  return () => {
    if (released) return
    released = true
    n = Math.max(0, n - 1)
    if (n === 0) {
      delete document.documentElement.dataset.kissaSheet
      notify()
    }
  }
}

export const openSheets = (): number => n

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** True while any sheet is open. */
export function useSheetOpen(): boolean {
  return useSyncExternalStore(subscribe, () => n > 0)
}

/** Registers a sheet while `open` is true. */
export function useSheet(open: boolean): void {
  useEffect(() => (open ? sheetOpened() : undefined), [open])
}
