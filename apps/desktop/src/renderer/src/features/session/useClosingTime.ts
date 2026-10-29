import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { translate, useLanguageStore } from '@renderer/i18n'

export const CLOSING_MINUTES = 30

/** True when `now` is in the first half hour of the closing hour and it has not run today. */
export function isClosingMoment(now: Date, hour: number, lastRunDay: string | null): boolean {
  return now.getHours() === hour && now.getMinutes() < 30 && lastRunDay !== now.toDateString()
}

/**
 * At the chosen hour, if music is playing: the room dims (see DaylightLayer), a 30 minute sleep
 * timer starts, and a card offers to keep playing instead.
 */
export function useClosingTime(): void {
  useEffect(() => {
    let lastRunDay: string | null = null
    const check = (): void => {
      const f = useFeaturesStore.getState()
      if (!f.closingTime) return
      const now = new Date()
      if (!isClosingMoment(now, f.closingHour, lastRunDay)) return
      const player = usePlayerStore.getState()
      if (!player.isPlaying || player.isScreensaver) return
      lastRunDay = now.toDateString()
      const sleep = useSleepStore.getState()
      if (sleep.endsAt !== null) return
      sleep.start(CLOSING_MINUTES, 'closing')
      const lang = useLanguageStore.getState().language
      useNoticeStore.getState().show({
        id: 'closing-time',
        title: translate(lang, 'closing.title'),
        body: translate(lang, 'closing.body', { minutes: CLOSING_MINUTES }),
        action: { label: translate(lang, 'closing.keep'), run: () => useSleepStore.getState().cancel() },
        duration: 15000
      })
    }
    check()
    const id = window.setInterval(check, 30_000)
    return () => window.clearInterval(id)
  }, [])
}
