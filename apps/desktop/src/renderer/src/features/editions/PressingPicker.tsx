import React, { memo, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePlayerStore, VINYL_COLORS, type VinylColor } from '@renderer/stores/playerStore'
import { VINYL_PRESSINGS, pressingGroups, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import { cn } from '@renderer/utils/cn'
import { useT } from '@renderer/i18n'

/**
 * Change the record's pressing from wherever the record is on screen (the Study Room has no
 * deck, so it cannot use the Edition editor). The button is a small sample of the record
 * itself; the choice applies at once and is the same setting the editor and Settings use.
 */
export const PressingPicker = memo(({ className }: { className?: string }): React.JSX.Element => {
  const t = useT()
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const current = VINYL_PRESSINGS[vinylColor] ?? VINYL_PRESSINGS.black

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      // Close the picker only; Esc must not also leave the room.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    // Put focus on the chosen pressing, so arrow keys work straight away.
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const move = (from: number, step: number): void => {
    const next = VINYL_COLORS[(from + step + VINYL_COLORS.length) % VINYL_COLORS.length]
    setVinylColor(next)
    rootRef.current?.querySelector<HTMLElement>(`[data-pressing-option="${next}"]`)?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('picker.label', { name: current.name })}
        title={t('picker.title')}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/70"
      >
        <span
          aria-hidden="true"
          className="relative block h-[18px] w-[18px] rounded-full ring-1 ring-white/25"
          style={{ background: pressingSwatch(vinylColor) }}
        >
          <span className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9cdb8]" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listId}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-30 mt-2 w-[276px] rounded-[18px] border border-white/10 bg-[rgba(16,14,13,0.92)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-[17px] leading-none text-white">{t('picker.heading')}</span>
              <span className="text-[11.5px] text-white/55">{current.name}</span>
            </div>
            <div role="radiogroup" aria-label={t('editor.pressingGroup')} className="mt-3">
              {pressingGroups(VINYL_COLORS).map((group) => (
                <div key={group.label} className="mt-2.5 first:mt-0">
                  <div className="mb-2 text-[10.5px] text-white/45">{group.label}</div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {group.colors.map((color: VinylColor) => {
                      const i = VINYL_COLORS.indexOf(color)
                      const selected = color === vinylColor
                      return (
                        <button
                          key={color}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={VINYL_PRESSINGS[color].name}
                          title={VINYL_PRESSINGS[color].name}
                          tabIndex={selected ? 0 : -1}
                          data-pressing-option={color}
                          onClick={() => setVinylColor(color)}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i, 1)
                            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i, -1)
                            else return
                            e.preventDefault()
                          }}
                          className={cn(
                            'relative mx-auto h-[28px] w-[28px] cursor-pointer rounded-full transition-[box-shadow] duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70',
                            selected ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.85)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.4)]'
                          )}
                          style={{ background: pressingSwatch(color) }}
                        >
                          <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9cdb8]" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

PressingPicker.displayName = 'PressingPicker'
