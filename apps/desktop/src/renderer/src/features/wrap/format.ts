import { useLanguageStore, type Translate } from '@renderer/i18n'

/** "42 minutes", "4.9 hours", "12 hours": short, with the language's decimal mark. */
export function formatTime(seconds: number, t: Translate): string {
  if (seconds < 3600) {
    const m = Math.max(1, Math.round(seconds / 60))
    return t(m === 1 ? 'pressed.minutes.one' : 'pressed.minutes.other', { n: m })
  }
  const h = seconds / 3600
  const n = h < 10 ? Math.round(h * 10) / 10 : Math.round(h)
  return t(n === 1 ? 'pressed.hours.one' : 'pressed.hours.other', { n: n.toLocaleString(useLanguageStore.getState().language) })
}
