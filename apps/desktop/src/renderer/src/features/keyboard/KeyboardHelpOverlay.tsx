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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={toggle}
        >
          <motion.div
            className="relative w-full max-w-[420px] bg-[#141216]/95 border border-white/[0.12] rounded-[24px] p-8 overflow-hidden select-none backdrop-blur-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
              <h2 className="text-[12px] text-zinc-300 uppercase tracking-[0.2em] font-mono font-bold">
                Quick Reference
              </h2>
              <button
                type="button"
                onClick={toggle}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-sm active:scale-95 border border-white/[0.08]"
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
                  <span className="text-white text-[13.5px] font-medium tracking-wide">
                    {sc.action}
                  </span>
                  <kbd className="min-w-[36px] px-2.5 py-1 text-center bg-black/60 border border-white/15 rounded-lg text-[11px] font-mono font-bold tracking-widest text-zinc-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/50 transition-all">
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
