import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Quote, X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useSavedLinesStore } from '@renderer/stores/savedLinesStore'
import { useT } from '@renderer/i18n'

/** The lyric lines the listener kept, newest first, like a page of underlined sentences. */
export function SavedLinesView(): React.JSX.Element {
  const lines = useSavedLinesStore((s) => s.lines)
  const remove = useSavedLinesStore((s) => s.remove)
  const t = useT()

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 pb-32 text-center">
        <Bookmark className="h-6 w-6 text-tone" strokeWidth={1.6} aria-hidden="true" />
        <p className="font-serif text-[1.35rem] text-ink">{t('lines.emptyTitle')}</p>
        <p className="max-w-xs text-[13px] leading-relaxed text-ink/70">{t('lines.emptyBody')}</p>
        <button
          type="button"
          onClick={() => usePlayerStore.getState().setActiveView('lyrics')}
          className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-tone px-4 text-[13px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_rgba(0,0,0,0.35)] transition-[filter,transform] hover:brightness-110 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-tone active:scale-[0.98]"
        >
          <Quote className="h-3.5 w-3.5" aria-hidden="true" />
          {t('lines.openLyrics')}
        </button>
      </div>
    )
  }

  return (
    <div className="no-scrollbar min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden pb-32">
      <div
        className="mx-auto grid w-full max-w-[1600px] gap-5 px-8 pt-2 min-[1100px]:px-16"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}
      >
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.figure
              layout
              key={line.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="group kissa-sheet relative m-0 flex flex-col justify-between gap-5 rounded-[22px] border border-panel-line p-6 shadow-[var(--panel-shadow)]"
            >
              <blockquote className="m-0 font-serif text-[1.3rem] leading-[1.32] tracking-[-0.01em] text-ink text-pretty">
                “{line.text}”
              </blockquote>
              <figcaption className="text-[12.5px] text-dim">
                <span className="text-ink/85">{line.title}</span>
                {line.artist && <span> · {line.artist}</span>}
              </figcaption>
              <button
                type="button"
                onClick={() => remove(line.id)}
                aria-label={t('lines.remove')}
                title={t('lines.remove')}
                className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-dim opacity-0 transition-[opacity,background-color,color] hover:bg-ink/[0.08] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
