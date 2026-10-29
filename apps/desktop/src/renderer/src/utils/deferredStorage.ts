import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * localStorage for zustand `persist` that saves later instead of on every change.
 *
 * The default JSON storage serialises and writes the whole store synchronously on
 * every set(). For a big store that runs on every song change and freezes the
 * window. This one keeps the latest value in memory, serialises it once after a
 * quiet moment (idle time, within `delayMs` plus one second), and writes straight
 * away when the window hides or closes so nothing is lost.
 */
export function createDeferredStorage<S>(delayMs = 1500): PersistStorage<S> {
  const pending = new Map<string, StorageValue<S>>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    for (const [name, value] of pending) {
      try {
        localStorage.setItem(name, JSON.stringify(value))
      } catch {
        // Quota or private mode: keep the app running; the next save tries again.
      }
    }
    pending.clear()
  }

  const schedule = (): void => {
    if (timer !== undefined) return
    timer = setTimeout(() => {
      timer = undefined
      const idle = (globalThis as { requestIdleCallback?: typeof requestIdleCallback })
        .requestIdleCallback
      if (idle) idle(() => flush(), { timeout: 1000 })
      else flush()
    }, delayMs)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    getItem: (name) => {
      const queued = pending.get(name)
      if (queued) return queued
      try {
        const raw = localStorage.getItem(name)
        return raw ? (JSON.parse(raw) as StorageValue<S>) : null
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      pending.set(name, value)
      schedule()
    },
    removeItem: (name) => {
      pending.delete(name)
      try {
        localStorage.removeItem(name)
      } catch {
        // ignore
      }
    }
  }
}
