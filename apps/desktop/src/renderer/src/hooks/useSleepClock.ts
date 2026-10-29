import { useEffect } from 'react'
import { tickSleep, useSleepStore } from '../stores/sleepStore'

export function useSleepClock(): void {
  const running = useSleepStore((s) => s.endsAt !== null)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => tickSleep(), 1000)
    return () => window.clearInterval(id)
  }, [running])
}
