import { memo, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Disc3, Ear } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { IconTile, TILE } from '@renderer/components/ui/IconTile'
import { useT, type MessageKey } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { useAlbumOnDeck } from '@renderer/features/album/AlbumEntry'
import { useHifiStore } from './hifiStore'
import { WEARS, type RecordWear } from './vinylSound'

const EASE = [0.22, 1, 0.36, 1] as const
const WIDTH = 344

const WEAR_LABEL: Record<RecordWear, MessageKey> = {
  mint: 'hifi.wear.mint',
  played: 'hifi.wear.played',
  loved: 'hifi.wear.loved'
}
const WEAR_DESC: Record<RecordWear, MessageKey> = {
  mint: 'hifi.wear.mint.desc',
  played: 'hifi.wear.played.desc',
  loved: 'hifi.wear.loved.desc'
}

/** A small drawing of the record's surface: more marks the more it has been played. */
function WearMark({ wear, active }: { wear: RecordWear; active: boolean }): React.JSX.Element {
  const marks = wear === 'mint' ? 0 : wear === 'played' ? 3 : 7
  const dots = [
    [7, 9],
    [15, 6],
    [17, 15],
    [6, 16],
    [12, 18],
    [10, 5],
    [18, 10]
  ].slice(0, marks)
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#0d0b0a"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.6"
      />
      {[9, 7, 5].map((r) => (
        <circle
          key={r}
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="0.5"
        />
      ))}
      <circle cx="12" cy="12" r="3" className={active ? 'fill-tone' : 'fill-white/40'} />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.55" fill="rgba(255,240,220,0.75)" />
      ))}
    </svg>
  )
}

/**
 * Kissa Hi-Fi's home: beside the record while an album from the PC is playing, with the state on
 * the button itself. Opens a card with the switch, how worn the record sounds, and Compare to
 * hear the clean file for as long as it is held.
 */
export const VinylSoundButton = memo(() => {
  const t = useT()
  const reduce = useReducedMotion()
  const onDeck = useAlbumOnDeck()
  const on = useHifiStore((s) => s.on)
  const wear = useHifiStore((s) => s.wear)
  const status = useHifiStore((s) => s.status)
  const comparing = useHifiStore((s) => s.comparing)
  const setOn = useHifiStore((s) => s.setOn)
  const setWear = useHifiStore((s) => s.setWear)
  const setComparing = useHifiStore((s) => s.setComparing)

  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!onDeck) setOpen(false)
  }, [onDeck])

  useEffect(() => {
    if (!open) {
      setComparing(false)
      return
    }
    const position = (): void => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.max(12, Math.min(window.innerWidth - WIDTH - 12, r.left))
      const below = window.innerHeight - r.bottom
      setPlace(
        below > 380
          ? { left, top: r.bottom + 10 }
          : { left, bottom: window.innerHeight - r.top + 10 }
      )
    }
    position()
    const focusFirst = window.setTimeout(
      () => panelRef.current?.querySelector<HTMLElement>('[role="switch"], button')?.focus(),
      30
    )
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent): void => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('resize', position)
    return () => {
      window.clearTimeout(focusFirst)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('resize', position)
    }
  }, [open, setComparing])

  if (!onDeck) return null

  const state =
    status === 'unavailable'
      ? t('hifi.state.unavailable')
      : !on
        ? t('hifi.state.off')
        : comparing
          ? t('hifi.state.comparing')
          : t('hifi.state.on', { wear: t(WEAR_LABEL[wear]) })

  const holdKey = (down: boolean) => (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (down && e.repeat) return
    setComparing(down)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="vinyl-sound-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('hifi.title')}: ${state}`}
        title={state}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone active:scale-[0.97]',
          open ? 'bg-white/[0.08] text-ink' : on ? 'text-ink/85' : 'text-dim'
        )}
      >
        <Disc3 className={cn('h-3.5 w-3.5', on && 'text-tone')} aria-hidden="true" />
        <span className="text-[12px]">{t('hifi.button')}</span>
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            on && status !== 'unavailable' ? 'bg-tone shadow-[0_0_6px_var(--accent)]' : 'bg-ink/25'
          )}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && place && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              data-testid="vinyl-sound-panel"
              initial={{
                opacity: 0,
                y: reduce ? 0 : place.top !== undefined ? -8 : 8,
                scale: reduce ? 1 : 0.98
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
              style={{ left: place.left, top: place.top, bottom: place.bottom, width: WIDTH }}
              className="fixed z-[90] overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#16120f]/[0.94] p-4 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150"
            >
              {/* Grooves, faintly, behind the title. */}
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full transition-opacity duration-700',
                  on ? 'opacity-70' : 'opacity-25'
                )}
                style={{
                  background:
                    'repeating-radial-gradient(circle, rgba(255,255,255,0.05) 0 1px, transparent 1px 5px), radial-gradient(closest-side, color-mix(in srgb, var(--accent) 35%, transparent), transparent)'
                }}
              />
              <div className="relative">
                <p
                  id={titleId}
                  className="font-kissa-editorial text-[22px] leading-tight tracking-[-0.015em] text-ink"
                >
                  {t('hifi.title')}
                </p>
                <p className="mt-1 text-[12.5px] text-ink/65" role="status">
                  {state}
                </p>

                <div className="mt-3 flex items-center gap-3 border-b border-white/[0.06] pb-3">
                  <IconTile icon={Disc3} tint={TILE.amber} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13.5px] font-medium leading-snug text-ink">
                      {t('hifi.switch')}
                    </span>
                    <span className="mt-0.5 text-[12px] leading-snug text-ink/60">
                      {t('hifi.switch.desc')}
                    </span>
                  </span>
                  <HardwareSwitch checked={on} onChange={setOn} aria-label={t('hifi.switch')} />
                </div>

                <fieldset
                  className={cn('mt-3 transition-opacity', !on && 'opacity-45')}
                  disabled={!on}
                >
                  <legend className="text-[12.5px] font-medium text-ink/80">
                    {t('hifi.wear')}
                  </legend>
                  <div
                    className="mt-2 grid grid-cols-3 gap-1.5"
                    role="radiogroup"
                    aria-label={t('hifi.wear')}
                  >
                    {WEARS.map((w) => {
                      const active = w === wear
                      return (
                        <button
                          key={w}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          data-testid={`vinyl-wear-${w}`}
                          onClick={() => setWear(w)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-[14px] px-1.5 py-2.5 text-[11.5px] font-medium transition-[background-color,box-shadow,color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-tone',
                            active
                              ? 'bg-tone/[0.16] text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_60%,transparent)]'
                              : 'bg-white/[0.045] text-ink/70 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.1)] hover:bg-white/[0.08]'
                          )}
                        >
                          <WearMark wear={w} active={active} />
                          {t(WEAR_LABEL[w])}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 min-h-[2.6em] text-[11.5px] leading-snug text-ink/55">
                    {t(WEAR_DESC[wear])}
                  </p>
                </fieldset>

                <button
                  type="button"
                  data-testid="vinyl-compare"
                  disabled={!on || status === 'unavailable'}
                  aria-pressed={comparing}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId)
                    setComparing(true)
                  }}
                  onPointerUp={() => setComparing(false)}
                  onPointerCancel={() => setComparing(false)}
                  onLostPointerCapture={() => setComparing(false)}
                  onKeyDown={holdKey(true)}
                  onKeyUp={holdKey(false)}
                  onBlur={() => setComparing(false)}
                  className={cn(
                    'mt-2 flex h-10 w-full select-none items-center justify-center gap-2 rounded-full text-[12.5px] font-medium transition-[background-color,transform] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
                    comparing
                      ? 'scale-[0.985] bg-white/[0.14] text-ink'
                      : 'bg-white/[0.07] text-ink/85 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14)] hover:bg-white/[0.1]'
                  )}
                >
                  <Ear className="h-4 w-4" aria-hidden="true" />
                  {comparing ? t('hifi.comparing') : t('hifi.compare')}
                </button>

                <p className="mt-3 text-[11.5px] leading-snug text-ink/45">{t('hifi.note')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
})
VinylSoundButton.displayName = 'VinylSoundButton'
