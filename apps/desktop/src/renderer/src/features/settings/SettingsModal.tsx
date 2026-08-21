import React from 'react'
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
 * High-end audio hardware aesthetic using Kissa's dynamic themes.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({ className }) => {
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

  if (!isSettingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={toggleSettings}
      />

      {/* Hardware Faceplate Surface */}
      <div
        className={cn(
          'relative z-50 w-full max-w-[720px] max-h-[85vh] flex flex-col rounded-[24px] overflow-hidden animate-in zoom-in-95 duration-150 select-none',
          'bg-[var(--deck-bg)] border border-[var(--deck-border)]',
          className
        )}
        style={{
          boxShadow: 'var(--deck-shadow)'
        }}
      >
        {/* Simple Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--panel-border)]">
          <h3 className="text-[14px] text-[var(--muted)] uppercase tracking-[0.2em] font-medium">
            Preferences
          </h3>
          <button
            type="button"
            onClick={toggleSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--on-surface)]/5 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close preferences"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-12 no-scrollbar">
          
          {/* Update Banner */}
          {updateAvailable && (
            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
              <div>
                <h4 className="text-[13px] font-medium text-[var(--accent)] mb-1 tracking-wide">Update Available</h4>
                <p className="text-[12px] text-[var(--muted)]">
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
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-[12px] font-medium tracking-wide hover:opacity-90 transition-opacity cursor-pointer shadow-[0_2px_8px_var(--accent)] shadow-black/20"
              >
                Download
              </button>
            </div>
          )}
          
          {/* Section 1: Atmosphere */}
          <div>
            <h4 className="text-[13px] font-medium text-[var(--on-surface)] mb-6 tracking-wide">Atmosphere</h4>
            <div className="grid grid-cols-4 gap-x-5 gap-y-8">
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
            <h4 className="text-[13px] font-medium text-[var(--on-surface)] mb-4 tracking-wide">Hardware Configuration</h4>
            <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] overflow-hidden flex flex-col shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
              
              {/* Speed */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--panel-border)] hover:bg-[var(--on-surface)]/5 transition-colors">
                <span className="text-[13px] text-[var(--muted)]">Platter Speed</span>
                <div className="flex items-center rounded-lg bg-black/40 p-1 border border-black/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] gap-1">
                  <button
                    type="button"
                    onClick={() => setRpm('33')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center min-w-[70px]',
                      rpm === '33' 
                        ? 'bg-[var(--accent)] text-black shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_50%,transparent)]' 
                        : 'text-[var(--muted)] hover:text-[var(--on-surface)] bg-transparent'
                    )}
                  >
                    33 RPM
                  </button>
                  <button
                    type="button"
                    onClick={() => setRpm('45')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center min-w-[70px]',
                      rpm === '45' 
                        ? 'bg-[var(--accent)] text-black shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_50%,transparent)]' 
                        : 'text-[var(--muted)] hover:text-[var(--on-surface)] bg-transparent'
                    )}
                  >
                    45 RPM
                  </button>
                </div>
              </div>

              {/* Needle Sound */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--panel-border)] hover:bg-[var(--on-surface)]/5 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[13px] text-[var(--muted)]">Tonearm Physics Sound</span>
                  <span className="text-[10px] text-[var(--muted)] opacity-60 mt-0.5">Physical thud and scratch on drop</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNeedleSound(!needleSound)}
                  className="w-10 h-6 flex items-center justify-center rounded-md bg-black/40 border border-black/50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] cursor-pointer active:scale-95 transition-transform"
                >
                  <Power 
                    className={cn(
                      "w-3.5 h-3.5 transition-all duration-300", 
                      needleSound ? "text-[var(--accent)] drop-shadow-[0_0_4px_var(--accent)]" : "text-white/20"
                    )} 
                    strokeWidth={needleSound ? 3 : 2}
                  />
                </button>
              </div>

              {/* Lyrics */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/5 transition-colors">
                <span className="text-[13px] text-[var(--muted)]">Auto-scroll Lyrics</span>
                <button
                  type="button"
                  onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                  className="w-10 h-6 flex items-center justify-center rounded-md bg-black/40 border border-black/50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] cursor-pointer active:scale-95 transition-transform"
                >
                  <Power 
                    className={cn(
                      "w-3.5 h-3.5 transition-all duration-300", 
                      autoScrollLyrics ? "text-[var(--accent)] drop-shadow-[0_0_4px_var(--accent)]" : "text-white/20"
                    )} 
                    strokeWidth={autoScrollLyrics ? 3 : 2}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Section 3: Integrations & Help */}
          <div>
            <h4 className="text-[13px] font-medium text-[var(--on-surface)] mb-4 tracking-wide">System Integrations</h4>
            <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] overflow-hidden flex flex-col shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
              
              {/* Telemetry */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--panel-border)] hover:bg-[var(--on-surface)]/5 transition-colors">
                <span className="text-[13px] text-[var(--muted)]">Desktop Media Sync (SMTC)</span>
                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-black/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
                  <span className="text-[10px] text-[var(--accent)] font-bold tracking-widest uppercase">Active</span>
                </div>
              </div>

              {/* Help */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/5 transition-colors">
                <span className="text-[13px] text-[var(--muted)]">Interactive Guide</span>
                <button
                  type="button"
                  onClick={() => {
                    toggleSettings()
                    usePlayerStore.getState().setIsOnboardingOpen(true)
                  }}
                  className="px-4 py-1.5 rounded-md bg-[var(--on-surface)]/5 hover:bg-[var(--on-surface)]/10 text-[var(--on-surface)] text-[11.5px] font-medium transition-colors cursor-pointer border border-[var(--on-surface)]/10"
                >
                  View Guide
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
