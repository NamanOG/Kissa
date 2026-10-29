import React, { memo, useState, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Timer, X, Minus, Plus } from 'lucide-react'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { cn } from '@renderer/utils/cn'
import { useT } from '@renderer/i18n'

const EASE = [0.22, 1, 0.36, 1] as const
const WIDTH = 288

export const SleepTimer = memo(({ className }: { className?: string }): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const t = useT()
  const [targetMinutes, setTargetMinutes] = useState<number>(30)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)
  const titleId = useId()
  const reduce = useReducedMotion()
  const endsAt = useSleepStore((s) => s.endsAt)
  const startSleep = useSleepStore((s) => s.start)
  const cancelSleep = useSleepStore((s) => s.cancel)
  const [now, setNow] = useState(() => Date.now())
  const timeLeft = endsAt === null ? null : Math.max(0, Math.round((endsAt - now) / 1000))

  useEffect(() => {
    if (endsAt === null) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  useEffect(() => {
    if (!isOpen) return

    // The dock clips what overflows it, so the card is placed on the page above the button,
    // like the room light and phone remote cards.
    const place = (): void => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (r) setAnchor({ left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 32 })
    }
    place()

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return // the button toggles it itself
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setIsOpen(false)
      }
    }

    // Escape closes the timer and hands focus back to its button, as the other dock popovers do.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    // Opening from the keyboard lands on the first control inside.
    const focusFirst = window.setTimeout(
      () => popoverRef.current?.querySelector<HTMLElement>('button')?.focus(),
      30
    )

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', place)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('resize', place)
      window.clearTimeout(focusFirst)
    }
  }, [isOpen])

  const close = (): void => {
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  const handleStart = (): void => {
    startSleep(targetMinutes)
    close()
  }

  const handleCancel = (): void => {
    cancelSleep()
    close()
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const left = anchor
    ? Math.max(12, Math.min(window.innerWidth - WIDTH - 12, anchor.left - WIDTH / 2))
    : 0

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        data-tour="sleep"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={timeLeft !== null ? `${t('sleep.title')}: ${formatTime(timeLeft)}` : t('sleep.title')}
        className={cn(
          'w-8 h-8 min-[900px]:w-9 min-[900px]:h-9 flex items-center justify-center rounded-full transition-colors relative cursor-pointer active:scale-95',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
          timeLeft !== null || isOpen
            ? 'text-tone bg-tone/15'
            : 'text-dim hover:text-ink hover:bg-ink/[0.08]'
        )}
        title={t('sleep.title')}
      >
        <Timer aria-hidden="true" className="w-4 h-4 min-[900px]:w-[18px] min-[900px]:h-[18px]" strokeWidth={1.75} />
        {timeLeft !== null && (
          <span aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-[#16120f] px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums text-tone shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_45%,transparent),0_2px_6px_rgba(0,0,0,0.5)]">
            {Math.ceil(timeLeft / 60)}m
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && anchor && (
            <motion.div
              ref={popoverRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 6 }}
              transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
              style={{ left, bottom: anchor.bottom, width: WIDTH, transformOrigin: 'bottom center' }}
              className="fixed z-[90] overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#16120f]/[0.93] p-4 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p id={titleId} className="font-kissa-editorial text-[22px] leading-tight tracking-[-0.015em] text-ink">
                    {t('sleep.title')}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink/65">
                    {timeLeft === null ? t('sleep.idle') : t('sleep.remaining')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t('sleep.close')}
                  className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>

              {timeLeft === null ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-[16px] bg-white/[0.05] p-1.5 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.1)]">
                    <button
                      type="button"
                      onClick={() => setTargetMinutes(Math.max(5, targetMinutes - 5))}
                      aria-label={t('sleep.less')}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/[0.07] text-ink transition-colors hover:bg-white/[0.13] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                    >
                      <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                    <div className="font-kissa-editorial text-[30px] leading-none tabular-nums text-ink" aria-live="polite">
                      {targetMinutes}
                      <span className="ml-1 font-sans text-[12px] text-ink/55">{t('sleep.min')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTargetMinutes(Math.min(120, targetMinutes + 5))}
                      aria-label={t('sleep.more')}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/[0.07] text-ink transition-colors hover:bg-white/[0.13] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                    >
                      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTargetMinutes(m)}
                        aria-pressed={targetMinutes === m}
                        aria-label={t('sleep.preset', { n: m })}
                        className={cn(
                          'h-8 cursor-pointer rounded-full text-[12px] font-medium tabular-nums transition-[color,background-color,box-shadow,transform] duration-ui ease-primary active:scale-95',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
                          targetMinutes === m
                            ? 'bg-tone/20 text-tone shadow-[inset_0_0_0_0.5px_color-mix(in_srgb,var(--accent)_55%,transparent)]'
                            : 'bg-white/[0.05] text-ink/65 hover:bg-white/[0.09] hover:text-ink'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleStart}
                    className="h-10 w-full cursor-pointer rounded-full bg-tone text-[13px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_rgba(0,0,0,0.35)] transition-[filter,transform] duration-ui ease-primary hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                  >
                    {t('sleep.start')}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="text-center font-kissa-editorial text-[44px] leading-none tabular-nums text-tone" role="timer">
                    {formatTime(timeLeft)}
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="h-10 w-full cursor-pointer rounded-full bg-white/[0.08] text-[13px] font-semibold text-ink shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)] transition-colors hover:bg-white/[0.13] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                  >
                    {t('sleep.cancel')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
})

SleepTimer.displayName = 'SleepTimer'
