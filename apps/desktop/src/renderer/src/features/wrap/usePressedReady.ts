import { useEffect } from 'react'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { useShelfStore } from '@renderer/stores/shelfStore'
import { translate, useLanguageStore } from '@renderer/i18n'
import { buildRecap, hasEnough } from './recap'
import { usePressedStore } from './pressedStore'
import { monthOf } from '@renderer/features/session/history'

const SHOWN_KEY = 'kissa_pressed_ready_v1'

/**
 * In the first week of a month, once, a quiet card says last month is pressed and opens it.
 * Runs a minute after start so it never competes with the opening, and only when last month
 * had enough music to say something.
 */
export function usePressedReady(): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const now = new Date()
        if (now.getDate() > 7) return
        const last = monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime())
        if (localStorage.getItem(SHOWN_KEY) === last) return
        if (document.documentElement.hasAttribute('data-window-hidden')) return
        const recap = buildRecap('month', now.getTime(), -1, useShelfStore.getState().records)
        if (!hasEnough(recap)) return
        localStorage.setItem(SHOWN_KEY, last)
        const lang = useLanguageStore.getState().language
        const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(recap.period.start))
        useNoticeStore.getState().show({
          id: `pressed-${last}`,
          title: translate(lang, 'pressed.ready', { month }),
          body: translate(lang, 'pressed.readyBody'),
          action: { label: translate(lang, 'pressed.open'), run: () => usePressedStore.getState().show('month', -1) },
          duration: 14000
        })
      } catch {
        // Nothing to show.
      }
    }, 60_000)
    return () => window.clearTimeout(id)
  }, [])
}
