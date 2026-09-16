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
    { key: '← / →', action: 'Seek ±5 seconds' },
    { key: 'Shift + ← / →', action: 'Previous / Next Track' },
    { key: 'T', action: 'Cycle Themes' },
    { key: 'A', action: 'Toggle Match Album' },
    { key: 'F11', action: 'Toggle Fullscreen' },
    { key: 'D', action: 'Start Listening Display' },
    { key: 'S', action: 'Open Settings' },
    { key: '↑ / ↓', action: 'Volume ±5%' },
    { key: '?', action: 'Toggle this overlay' },
    { key: 'Esc', action: 'Close modals' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={toggle}
        >
          <motion.div
            className="relative w-full max-w-[420px] bg-[var(--panel-bg)] border border-white/[0.1] rounded-2xl p-8 overflow-hidden select-none shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
              <h2 className="text-[12px] text-[var(--muted)] uppercase tracking-[0.2em] font-kissa-chassis font-bold">
                Quick Reference
              </h2>
              <button
                type="button"
                onClick={toggle}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-[color,background-color,transform] duration-ui ease-primary cursor-pointer shadow-sm active:scale-95 border border-white/[0.08]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-2.5">
              {shortcuts.map((sc, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between group py-2 px-3 rounded-xl hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-[var(--on-surface)] text-[13.5px] font-medium tracking-wide">
                    {sc.action}
                  </span>
                  <kbd className="min-w-[36px] px-2.5 py-1 text-center bg-black/40 border border-white/10 rounded text-[11px] font-kissa-chassis font-bold tracking-widest text-[var(--muted)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/50 transition-colors duration-ui ease-primary">
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
