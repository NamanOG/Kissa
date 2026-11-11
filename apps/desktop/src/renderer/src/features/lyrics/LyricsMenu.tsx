import { useReturnFocus } from '@renderer/hooks/useReturnFocus'
import { useEffect, useId, useRef, useState } from 'react'
import { Check, Minus, MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { useT } from '@renderer/i18n'
import { useDesktopLyricsStore } from '../desktop-lyrics/desktopLyricsStore'

interface LyricsMenuProps {
  /** "Find other lyrics" opens the search dialog (only when Kissa looked the lyrics up itself). */
  onChoose?: () => void
  /** Timing applies to timed lyrics only. */
  timed: boolean
  offset: number
  onNudge: (delta: number) => void
  onReset: () => void
}

const ITEM =
  'flex h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-medium text-ink/85 transition-colors hover:bg-ink/[0.07] hover:text-ink focus-visible:bg-ink/[0.07] focus-visible:outline-none'
const STEP =
  'flex h-7 w-7 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/10 hover:text-ink'

/**
 * Lyrics options: one quiet button instead of a row of pills. Holds finding other lyrics,
 * Desktop lyrics and the timing nudge. Escape or a click outside closes it and focus returns
 * to the button.
 */
export function LyricsMenu({ onChoose, timed, offset, onNudge, onReset }: LyricsMenuProps): React.JSX.Element | null {
  const t = useT()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useReturnFocus(open, button)
  const id = useId()
  const desktopOn = useDesktopLyricsStore((s) => s.status.enabled)
  const desktopAvailable = useDesktopLyricsStore((s) => s.available)

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      button.current?.focus()
    }
    const onDown = (e: PointerEvent): void => {
      const target = e.target as Node
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [open])

  if (!onChoose && !desktopAvailable && !timed) return null

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={t('lyrics.options')}
        title={t('lyrics.options')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          open ? 'bg-ink/[0.1] text-ink' : 'text-dim hover:bg-ink/[0.07] hover:text-ink'
        )}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={panel}
          id={id}
          role="group"
          aria-label={t('lyrics.options')}
          className="absolute right-0 top-10 z-40 w-[248px] origin-top-right rounded-[14px] border border-panel-line bg-[var(--panel-bg)] p-1.5 shadow-[var(--panel-shadow)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
        >
          {onChoose && (
            <button
              type="button"
              className={ITEM}
              onClick={() => {
                setOpen(false)
                onChoose()
              }}
            >
              {t('lyrics.findOther')}
            </button>
          )}
          {desktopAvailable && (
            <button
              type="button"
              role="switch"
              aria-checked={desktopOn}
              data-testid="desktop-lyrics-toggle"
              title={t('dlyrics.desc')}
              className={ITEM}
              onClick={() => useDesktopLyricsStore.getState().change({ enabled: !desktopOn })}
            >
              <span className="flex-1">{t('dlyrics.toggle')}</span>
              <Check className={cn('h-4 w-4 text-tone', !desktopOn && 'invisible')} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
          {timed && (
            <div
              role="group"
              aria-label={t('lyrics.timingLabel')}
              className="mt-1 flex h-10 items-center gap-1 border-t border-panel-line px-3 pt-1"
            >
              <span className="flex-1 text-[13px] font-medium text-ink/85">{t('lyrics.timingLabel')}</span>
              <button type="button" className={STEP} onClick={() => onNudge(-0.1)} aria-label={t('lyrics.earlierLabel')} title={t('lyrics.earlier.hint')}>
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onReset}
                title={t('lyrics.resetTiming')}
                className="min-w-[46px] rounded-full px-1 text-center text-[12px] font-semibold tabular-nums text-ink"
              >
                {offset > 0 ? '+' : ''}
                {offset.toFixed(1)}s
              </button>
              <button type="button" className={STEP} onClick={() => onNudge(0.1)} aria-label={t('lyrics.laterLabel')} title={t('lyrics.later.hint')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
