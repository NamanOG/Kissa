import React, { memo, useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { X } from 'lucide-react'
import { useT, type MessageKey } from '@renderer/i18n'

type Shortcut = { keys: string[]; action: MessageKey }
type Group = { title: MessageKey; items: Shortcut[] }

// Grouped the way people look for them: the music, where to look, the room.
const GROUPS: Group[] = [
  {
    title: 'keys.group.playback',
    items: [
      { keys: ['Space'], action: 'keys.playPause' },
      { keys: ['←', '→'], action: 'keys.seek' },
      { keys: ['Shift', '←', '→'], action: 'keys.skip' },
      { keys: ['↑', '↓'], action: 'keys.volume' },
      { keys: ['M'], action: 'keys.mute' }
    ]
  },
  {
    title: 'keys.group.views',
    items: [
      { keys: ['L'], action: 'keys.lyrics' },
      { keys: ['D'], action: 'keys.display' },
      { keys: ['P'], action: 'keys.party' },
      { keys: ['F11'], action: 'keys.fullscreen' }
    ]
  },
  {
    title: 'keys.group.room',
    items: [
      { keys: ['E'], action: 'keys.edition' },
      { keys: ['A'], action: 'keys.match' },
      { keys: ['T'], action: 'keys.themes' },
      { keys: ['S'], action: 'keys.settings' },
      { keys: ['?'], action: 'keys.help' },
      { keys: ['Esc'], action: 'keys.close' }
    ]
  }
]

const KEYCAP =
  'inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] bg-white/[0.08] px-1.5 text-[11.5px] font-medium leading-none text-ink/85 shadow-[inset_0_-1px_0_rgba(0,0,0,0.35),inset_0_0_0_0.5px_rgba(255,255,255,0.12)]'

export const KeyboardHelpOverlay = memo((): React.JSX.Element => {
  const isOpen = usePlayerStore((s) => s.isKeyboardHelpOpen)
  const toggle = usePlayerStore((s) => s.toggleKeyboardHelp)
  const panelRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const reduce = useReducedMotion()
  useDialogFocus(panelRef, isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={toggle}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('keys.title')}
            className="relative flex max-h-full w-full max-w-[680px] select-none flex-col overflow-hidden rounded-[24px] border border-white/[0.09] kissa-sheet shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 px-7 pt-6">
              <div>
                <h2 className="font-kissa-editorial text-[26px] leading-tight tracking-[-0.015em] text-ink">
                  {t('keys.title')}
                </h2>
                <p className="mt-1 text-[12.5px] text-dim">{t('keys.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={toggle}
                className="-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/55 transition-[color,background-color,transform] duration-ui ease-primary hover:bg-white/10 hover:text-ink active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                aria-label={t('keys.closeLabel')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-x-8 gap-y-6 overflow-y-auto px-7 pb-7 pt-6 min-[720px]:grid-cols-2">
              {GROUPS.map((group, gi) => (
                <section key={group.title} className={gi === 2 ? 'min-[720px]:col-start-2 min-[720px]:row-start-1 min-[720px]:row-span-2' : undefined}>
                  <h3 className="mb-2 text-[12.5px] font-medium text-tone">{t(group.title)}</h3>
                  <dl className="divide-y divide-white/[0.06] rounded-[14px] bg-white/[0.035] px-3.5 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.07)]">
                    {group.items.map((sc) => (
                      <div key={sc.action} className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="text-[13.5px] text-ink/90">{t(sc.action)}</dt>
                        <dd className="flex shrink-0 items-center gap-1">
                          {sc.keys.map((k) => (
                            <kbd key={k} className={KEYCAP}>{k}</kbd>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

KeyboardHelpOverlay.displayName = 'KeyboardHelpOverlay'
