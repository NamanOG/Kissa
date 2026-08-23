import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Power } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { cn } from '@renderer/utils/cn'

export interface SettingsModalProps {
  className?: string
}

/**
 * Audiophile Preferences Modal.
 * High-end audio hardware aesthetic with 60/120 FPS GPU-accelerated scrolling.
 */
export const SettingsModal = memo(({ className }: SettingsModalProps): React.JSX.Element | null => {
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
  const toggleSettings = usePlayerStore((s) => s.toggleSettings)
  const currentTheme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const rpm = usePlayerStore((s) => s.rpm)
  const setRpm = usePlayerStore((s) => s.setRpm)
  const needleSound = usePlayerStore((s) => s.needleSound)
  const setNeedleSound = usePlayerStore((s) => s.setNeedleSound)
  const autoScrollLyrics = usePlayerStore((s) => s.autoScrollLyrics)
  const setAutoScrollLyrics = usePlayerStore((s) => s.setAutoScrollLyrics)
  const updateAvailable = usePlayerStore((s) => s.updateAvailable)

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-[640px]:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={toggleSettings}
          />

          {/* Hardware Faceplate Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'relative z-50 w-full max-w-[700px] max-h-[85vh] flex flex-col rounded-[24px] overflow-hidden select-none border border-white/[0.12] bg-[#141216] shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] [transform:translateZ(0)]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.08] shrink-0 bg-[#141216]">
              <h3 className="text-[12px] text-zinc-300 uppercase tracking-[0.2em] font-mono font-bold">
                Preferences
              </h3>
              <button
                type="button"
                onClick={toggleSettings}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-sm active:scale-95 border border-white/[0.08]"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Smooth GPU Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 no-scrollbar overscroll-contain [transform:translateZ(0)]">
              
              {/* Update Banner */}
              {updateAvailable && (
                <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--accent)] mb-0.5 tracking-wide">Update Available</h4>
                    <p className="text-[12px] text-zinc-400">
                      Version {updateAvailable.version} is now available on GitHub.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electron?.openExternal) {
                        window.electron.openExternal(updateAvailable.url)
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-[12px] font-bold tracking-wide hover:opacity-90 transition-opacity cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
                  >
                    Download
                  </button>
                </div>
              )}
              
              {/* Section 1: Atmosphere */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-zinc-400 mb-3 tracking-[0.2em] uppercase">Atmosphere</h4>
                <div className="grid grid-cols-4 gap-x-4 gap-y-5">
                  {LISTENING_ENVIRONMENTS.map((env) => (
                    <ThemeCard
                      key={env.id}
                      theme={env}
                      isSelected={currentTheme === env.id}
                      onSelect={() => setTheme(env.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Section 2: Playback */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-zinc-400 mb-2.5 tracking-[0.2em] uppercase">Hardware Configuration</h4>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
                  
                  {/* Speed */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-white">Platter Speed</span>
                    <div className="flex items-center rounded-xl bg-black/60 p-1 border border-white/10 shadow-inner gap-1">
                      <button
                        type="button"
                        onClick={() => setRpm('33')}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center min-w-[70px]',
                          rpm === '33' 
                            ? 'bg-[var(--accent)] text-black shadow-[0_0_14px_var(--accent)]' 
                            : 'text-zinc-400 hover:text-white bg-transparent'
                        )}
                      >
                        33 RPM
                      </button>
                      <button
                        type="button"
                        onClick={() => setRpm('45')}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center min-w-[70px]',
                          rpm === '45' 
                            ? 'bg-[var(--accent)] text-black shadow-[0_0_14px_var(--accent)]' 
                            : 'text-zinc-400 hover:text-white bg-transparent'
                        )}
                      >
                        45 RPM
                      </button>
                    </div>
                  </div>

                  {/* Needle Sound */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-white">Tonearm Physics Sound</span>
                      <span className="text-[11.5px] text-zinc-400 mt-0.5">Physical needle thud and vinyl groove friction</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNeedleSound(!needleSound)}
                      className="w-11 h-7 flex items-center justify-center rounded-lg bg-black/60 border border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95 transition-transform"
                    >
                      <Power 
                        className={cn(
                          "w-4 h-4 transition-all duration-300", 
                          needleSound ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" : "text-white/20"
                        )} 
                        strokeWidth={needleSound ? 3 : 2}
                      />
                    </button>
                  </div>

                  {/* Lyrics */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-white">Auto-scroll Lyrics</span>
                    <button
                      type="button"
                      onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                      className="w-11 h-7 flex items-center justify-center rounded-lg bg-black/60 border border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95 transition-transform"
                    >
                      <Power 
                        className={cn(
                          "w-4 h-4 transition-all duration-300", 
                          autoScrollLyrics ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" : "text-white/20"
                        )} 
                        strokeWidth={autoScrollLyrics ? 3 : 2}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Section 3: Integrations & Help */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-zinc-400 mb-2.5 tracking-[0.2em] uppercase">System Integrations</h4>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]">
                  
                  {/* Telemetry */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-white">Windows Media Sync (SMTC)</span>
                      <span className="text-[11.5px] text-zinc-400 mt-0.5">Spotify, Apple Music, Tidal, & Web Media tracking</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--accent)]/15 px-3 py-1.5 rounded-full border border-[var(--accent)]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
                      <span className="text-[10px] text-[var(--accent)] font-bold tracking-widest uppercase">Active</span>
                    </div>
                  </div>

                  {/* Help */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-white">Interactive Guide</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSettings()
                        usePlayerStore.getState().setIsOnboardingOpen(true)
                      }}
                      className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-[12px] font-bold transition-colors cursor-pointer border border-white/10 active:scale-95"
                    >
                      View Guide
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

SettingsModal.displayName = 'SettingsModal'
