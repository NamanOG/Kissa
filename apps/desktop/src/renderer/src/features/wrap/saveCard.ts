import { translate, useLanguageStore } from '@renderer/i18n'
import type { TallyEntry } from '@renderer/features/session/tally'
import type { Recap } from './recap'
import { canExport, cardText, drawPressedCard } from './cardCanvas'
import { formatTime } from './format'

/**
 * Saves the Pressed card as a PNG. Windows shows its own Save dialog for the download; the
 * image is also put on the clipboard so it can be pasted straight into a chat.
 */
export async function savePressedCard(recap: Recap, covers: (e: TallyEntry) => string | undefined, title: string): Promise<boolean> {
  const lang = useLanguageStore.getState().language
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>): string => translate(lang, key, vars)
  let canvas = await drawPressedCard(recap, covers, cardText(recap, title, t, formatTime(recap.seconds, t)))
  // A cover from the web can lock the canvas; draw it again without covers.
  if (!canExport(canvas)) canvas = await drawPressedCard(recap, () => undefined, cardText(recap, title, t, formatTime(recap.seconds, t)))
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return false
  try {
    await navigator.clipboard?.write?.([new ClipboardItem({ 'image/png': blob })])
  } catch {
    // The clipboard is a bonus.
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Kissa Pressed ${title.replace(/[\\/:*?"<>|.,]+/g, '').trim()}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return true
}
