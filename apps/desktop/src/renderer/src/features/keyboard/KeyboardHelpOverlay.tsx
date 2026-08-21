import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { X } from 'lucide-react'

export const KeyboardHelpOverlay = memo((): React.JSX.Element => {
  const isOpen = usePlayerStore((s) => s.isKeyboardHelpOpen)
  const toggle = usePlayerStore((s) => s.toggleKeyboardHelp)

  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'L', action: 'Toggle Lyrics View' },
    { key: '← / →', action: 'Previous / Next Track' },
    { key: 'T', action: 'Cycle Themes' },
    { key: 'S', action: 'Open Settings' },
    { key: '↑ / ↓', action: 'Volume ±5%' },
    { key: '?', action: 'Toggle this overlay' },
    { key: 'Esc', action: 'Close modals' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={toggle}
        >
          <motion.div
            className="relative w-full max-w-[420px] bg-[var(--deck-bg)] border border-[var(--deck-border)] rounded-[24px] p-8 overflow-hidden select-none"
            style={{ boxShadow: 'var(--deck-shadow)' }}
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-10 pb-4 border-b border-[var(--panel-border)]">
              <h2 className="text-[14px] text-[var(--muted)] uppercase tracking-[0.2em] font-medium">Quick Reference</h2>
              <button
                type="button"
                onClick={toggle}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--on-surface)]/5 transition-all cursor-pointer shadow-sm active:scale-95"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between group py-1">
                  <span className="text-[var(--muted)] text-[13px]">{sc.action}</span>
                  <kbd className="min-w-[32px] px-2.5 py-1.5 text-center bg-black/40 border border-black/50 rounded-md text-[11px] font-mono font-bold tracking-widest text-[var(--on-surface)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] group-hover:text-[var(--accent)] transition-colors">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

KeyboardHelpOverlay.displayName = 'KeyboardHelpOverlay'
