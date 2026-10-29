import React, { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { useT } from '@renderer/i18n'

/** The card itself: glass, the room's accent, gone after a few seconds unless hovered. */
export function RoomNoticeCard(): React.JSX.Element {
  const notice = useNoticeStore((s) => s.notice)
  const dismiss = useNoticeStore((s) => s.dismiss)
  const reduceMotion = useReducedMotion()
  const t = useT()
  const [hovered, setHovered] = React.useState(false)

  useEffect(() => {
    if (!notice || hovered) return
    const id = window.setTimeout(() => dismiss(notice.id), notice.duration ?? 8000)
    return () => window.clearTimeout(id)
  }, [notice, hovered, dismiss])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[96px] z-[60] flex justify-center px-4">
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            role="status"
            aria-live="polite"
            data-testid="room-notice"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="kissa-sheet pointer-events-auto relative flex w-full max-w-[440px] items-center gap-4 overflow-hidden rounded-[22px] border border-panel-line p-3.5 pr-4 shadow-[var(--panel-shadow)]"
          >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-tone/70 to-transparent" />
            {notice.covers && notice.covers.length > 0 && (
              <div className="relative h-14 flex-none" style={{ width: 56 + (notice.covers.length - 1) * 14 }}>
                {notice.covers.slice(0, 3).map((src, i, all) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="absolute top-0 h-14 w-14 rounded-[10px] object-cover shadow-[0_8px_18px_-6px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    style={{ left: i * 14, zIndex: all.length - i, transform: `rotate(${(i - (all.length - 1) / 2) * 3}deg)` }}
                  />
                ))}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[17px] leading-tight text-ink">{notice.title}</p>
              {notice.body && <p className="mt-1 text-[12.5px] leading-snug text-dim">{notice.body}</p>}
              {notice.stats && (
                <div className="mt-1.5 flex gap-4">
                  {notice.stats.map(([value, label]) => (
                    <p key={label} className="text-[12px] text-dim">
                      <span className="mr-1 font-sans text-[15px] font-semibold tabular-nums text-ink">{value}</span>
                      {label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {notice.action && (
              <button
                type="button"
                onClick={() => {
                  notice.action?.run()
                  dismiss(notice.id)
                }}
                className="h-8 flex-none cursor-pointer rounded-full bg-tone px-3.5 text-[12px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-[filter,transform] hover:brightness-110 active:scale-95"
              >
                {notice.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label={t('notice.dismiss')}
              onClick={() => dismiss(notice.id)}
              className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.08] hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
