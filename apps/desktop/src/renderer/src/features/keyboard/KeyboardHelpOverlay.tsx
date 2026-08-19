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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={toggle}
        >
          <motion.div
            className="relative w-full max-w-[420px] bg-[#151210]/95 rounded-[16px] shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] p-8 overflow-hidden select-none"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-[14px] text-[#f5efe6] font-medium tracking-wide">Quick Reference</h2>
              <button
                type="button"
                onClick={toggle}
                className="text-[#887b70] hover:text-[#f5efe6] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-[#a99b90] text-[13px]">{sc.action}</span>
                  <kbd className="min-w-[32px] px-2.5 py-1 text-center bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] font-mono text-[#d6c9bb] shadow-sm group-hover:bg-white/[0.08] transition-colors">
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
