import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { cn } from '@renderer/utils/cn'

export interface SettingsModalProps {
  className?: string
}

/**
 * Audiophile Preferences Modal.
 * Clean, restrained, Apple-level design discipline.
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
        className="fixed inset-0 bg-black/65 transition-opacity animate-in fade-in duration-150"
        onClick={toggleSettings}
      />

      {/* Modal Surface */}
      <div
        className={cn(
          'relative z-50 w-full max-w-[720px] max-h-[85vh] flex flex-col rounded-[24px] bg-[#1a1715] border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-in zoom-in-95 duration-150 select-none',
          className
        )}
      >
        {/* Simple Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <h3 className="text-[15px] text-[#f5efe6] font-medium tracking-wide">
            Preferences
          </h3>
          <button
            type="button"
            onClick={toggleSettings}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#887b70] hover:text-[#f5efe6] hover:bg-white/[0.1] transition-all cursor-pointer"
            aria-label="Close preferences"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-12 no-scrollbar">
          
          {/* Update Banner */}
          {updateAvailable && (
            <div className="bg-[#d7a76c]/10 border border-[#d7a76c]/20 rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_16px_rgba(215,167,108,0.05)]">
              <div>
                <h4 className="text-[13px] font-medium text-[#d7a76c] mb-1 tracking-wide">Update Available</h4>
                <p className="text-[12px] text-[#b7a99b]">
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
                className="px-4 py-2 rounded-lg bg-[#d7a76c] text-[#1a1410] text-[12px] font-medium tracking-wide hover:bg-[#dfb47e] transition-colors cursor-pointer"
              >
                Download
              </button>
            </div>
          )}
          
          {/* Section 1: Atmosphere */}
          <div>
            <h4 className="text-[13px] font-medium text-[#f5efe6] mb-6">Atmosphere</h4>
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
            <h4 className="text-[13px] font-medium text-[#f5efe6] mb-4">Playback</h4>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] overflow-hidden flex flex-col">
              
              {/* Speed */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                <span className="text-[13px] text-[#d6c9bb]">Platter Speed</span>
                <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setRpm('33')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                      rpm === '33' ? 'bg-[#d7a76c] text-[#1a1410] shadow-sm' : 'text-[#887b70] hover:text-[#f5efe6]'
                    )}
                  >
                    33 RPM
                  </button>
                  <button
                    type="button"
                    onClick={() => setRpm('45')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                      rpm === '45' ? 'bg-[#d7a76c] text-[#1a1410] shadow-sm' : 'text-[#887b70] hover:text-[#f5efe6]'
                    )}
                  >
                    45 RPM
                  </button>
                </div>
              </div>

              {/* Needle Sound */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                <span className="text-[13px] text-[#d6c9bb]">Needle Drop Physics</span>
                <button
                  type="button"
                  onClick={() => setNeedleSound(!needleSound)}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors cursor-pointer border border-white/[0.1]',
                    needleSound ? 'bg-[#d7a76c]' : 'bg-[#2a2420]'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-[#1a1410] transition-transform duration-200 mt-[2px] ml-[2px]',
                      needleSound ? 'translate-x-[15px]' : 'translate-x-0 bg-[#887b70]'
                    )}
                  />
                </button>
              </div>

              {/* Lyrics */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-white/[0.02] transition-colors">
                <span className="text-[13px] text-[#d6c9bb]">Auto-scroll Lyrics</span>
                <button
                  type="button"
                  onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors cursor-pointer border border-white/[0.1]',
                    autoScrollLyrics ? 'bg-[#d7a76c]' : 'bg-[#2a2420]'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-[#1a1410] transition-transform duration-200 mt-[2px] ml-[2px]',
                      autoScrollLyrics ? 'translate-x-[15px]' : 'translate-x-0 bg-[#887b70]'
                    )}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* Section 3: Integrations & Help */}
          <div>
            <h4 className="text-[13px] font-medium text-[#f5efe6] mb-4">Advanced</h4>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] overflow-hidden flex flex-col">
              
              {/* Telemetry */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                <span className="text-[13px] text-[#d6c9bb]">Desktop Media Sync (SMTC)</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[11px] text-[#887b70] font-medium tracking-wide">ACTIVE</span>
                </div>
              </div>

              {/* Help */}
              <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-white/[0.02] transition-colors">
                <span className="text-[13px] text-[#d6c9bb]">Interactive Guide</span>
                <button
                  type="button"
                  onClick={() => {
                    toggleSettings()
                    usePlayerStore.getState().setIsOnboardingOpen(true)
                  }}
                  className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-[#d6c9bb] hover:text-[#f5efe6] text-[11.5px] font-medium transition-colors cursor-pointer"
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
