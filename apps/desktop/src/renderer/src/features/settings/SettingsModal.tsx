import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { cn } from '@renderer/utils/cn'
import phonoLogo from '@renderer/media/phono_logo.png'

export interface SettingsModalProps {
  className?: string
}

/**
 * Audiophile Preferences Modal.
 * Inspired by Dieter Rams / Braun precision hardware calibration panels.
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

  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isSettingsOpen) {
        toggleSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, toggleSettings])

  if (!isSettingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={toggleSettings}
      />

      {/* Modal Surface */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-50 w-full max-w-[620px] max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.12] bg-[#1a1715]/95 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-150 select-none',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.08] bg-black/25">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.14] shadow-md flex items-center justify-center shrink-0">
              <img src={phonoLogo} alt="Kissa Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#f5efe6] font-medium tracking-tight">
                Preferences
              </h3>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#a99b90]">
                Kissa Audio Engine
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a99b90] hover:text-[#f5efe6] hover:bg-white/[0.08] transition-all cursor-pointer"
            aria-label="Close preferences"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8 no-scrollbar">
          {/* Section 1: Listening Environments */}
          <div>
            <div className="flex items-baseline justify-between mb-4 border-b border-white/[0.06] pb-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[10px] text-[#d7a76c] font-bold tracking-widest">01</span>
                <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d6c9bb] font-semibold">
                  Listening Environments
                </h4>
              </div>
              <span className="font-mono text-[9.5px] text-[#887b70] uppercase tracking-wider">
                8 Atmospheres
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
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

          {/* Section 2: Mechanical Deck Preferences */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-4 border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] text-[#d7a76c] font-bold tracking-widest">02</span>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d6c9bb] font-semibold">
                Turntable Mechanics
              </h4>
            </div>

            <div className="space-y-3">
              {/* Default Speed */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.08] bg-black/25">
                <div>
                  <p className="text-sm font-medium text-[#f5efe6]">Default Speed</p>
                  <p className="text-xs text-[#887b70]">Rotational velocity of the platter</p>
                </div>

                <div className="flex items-center rounded-lg border border-white/[0.08] bg-black/40 p-0.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setRpm('33')}
                    className={cn(
                      'px-3.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer',
                      rpm === '33' ? 'bg-[#d7a76c] text-[#1a1410] shadow-sm' : 'text-[#887b70] hover:text-[#f5efe6]'
                    )}
                  >
                    33 RPM
                  </button>
                  <button
                    type="button"
                    onClick={() => setRpm('45')}
                    className={cn(
                      'px-3.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer',
                      rpm === '45' ? 'bg-[#d7a76c] text-[#1a1410] shadow-sm' : 'text-[#887b70] hover:text-[#f5efe6]'
                    )}
                  >
                    45 RPM
                  </button>
                </div>
              </div>

              {/* Needle Cueing Physics */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.08] bg-black/25">
                <div>
                  <p className="text-sm font-medium text-[#f5efe6]">Needle Lift & Drop Depth</p>
                  <p className="text-xs text-[#887b70]">Dynamic Z-space stylus elevation on cue</p>
                </div>

                <button
                  type="button"
                  onClick={() => setNeedleSound(!needleSound)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors cursor-pointer border border-white/[0.1] shadow-inner',
                    needleSound ? 'bg-[#d7a76c]' : 'bg-neutral-800'
                  )}
                  aria-label="Toggle needle elevation"
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-[#1a1410] transition-transform duration-200 mt-0.5 ml-0.5 shadow-sm',
                      needleSound ? 'translate-x-5' : 'translate-x-0 bg-neutral-400'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Lyrics Experience */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-4 border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] text-[#d7a76c] font-bold tracking-widest">03</span>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d6c9bb] font-semibold">
                Lyrics & Display
              </h4>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.08] bg-black/25">
              <div>
                <p className="text-sm font-medium text-[#f5efe6]">Auto-Center Active Lyric</p>
                <p className="text-xs text-[#887b70]">Smooth spring centering as song progresses</p>
              </div>

              <button
                type="button"
                onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors cursor-pointer border border-white/[0.1] shadow-inner',
                  autoScrollLyrics ? 'bg-[#d7a76c]' : 'bg-neutral-800'
                )}
                aria-label="Toggle lyric auto-centering"
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-[#1a1410] transition-transform duration-200 mt-0.5 ml-0.5 shadow-sm',
                    autoScrollLyrics ? 'translate-x-5' : 'translate-x-0 bg-neutral-400'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Section 4: System Telemetry */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-4 border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] text-[#d7a76c] font-bold tracking-widest">04</span>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d6c9bb] font-semibold">
                Media Detection
              </h4>
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.06] bg-black/35">
              <div>
                <p className="text-xs font-mono font-semibold text-[#f5efe6]">Windows SMTC Sync</p>
                <p className="text-[10px] text-[#887b70] mt-0.5">Spotify, Apple Music, Tidal & Desktop Browsers</p>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-[#a99b90]">
                <span className="w-2 h-2 rounded-full bg-[#d7a76c] shadow-[0_0_8px_rgba(215,167,108,0.7)] animate-pulse" />
                <span className="tracking-wider uppercase font-semibold">Active</span>
              </div>
            </div>
          </div>

          {/* Section 5: Guide & Overview */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-4 border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] text-[#d7a76c] font-bold tracking-widest">05</span>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d6c9bb] font-semibold">
                Introduction & Help
              </h4>
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.06] bg-black/35">
              <div>
                <p className="text-xs font-mono font-semibold text-[#f5efe6]">Welcome Tour</p>
                <p className="text-[10px] text-[#887b70] mt-0.5">Revisit the first-time interactive walkthrough and vinyl ritual guide</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  toggleSettings()
                  usePlayerStore.getState().setIsOnboardingOpen(true)
                }}
                className="px-3.5 py-1.5 rounded-lg border border-[#d7a76c]/40 bg-[#d7a76c]/15 text-[#f5efe6] hover:bg-[#d7a76c]/25 text-[11px] font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                Open Guide
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-white/[0.08] bg-black/30 text-xs text-[#887b70]">
          <span className="font-mono text-[11px]">Kissa Desktop v1.0.1</span>
          <div className="flex items-center gap-2 text-[12px] text-[#b7a99b]">
            <span>
              Crafted by{' '}
              <a
                href="https://github.com/NamanOG"
                onClick={(e) => {
                  e.preventDefault()
                  if (window.electron?.openExternal) {
                    window.electron.openExternal('https://github.com/NamanOG')
                  } else {
                    window.open('https://github.com/NamanOG', '_blank', 'noopener,noreferrer')
                  }
                }}
                className="text-[#f5efe6] font-medium hover:text-[#d7a76c] hover:underline underline-offset-2 transition-colors cursor-pointer"
              >
                Naman
              </a>
            </span>
            <span className="text-[#d7a76c]/80 font-mono text-[11px] font-medium select-none">&lt; &gt;</span>
            <a
              href="https://github.com/NamanOG"
              onClick={(e) => {
                e.preventDefault()
                if (window.electron?.openExternal) {
                  window.electron.openExternal('https://github.com/NamanOG')
                } else {
                  window.open('https://github.com/NamanOG', '_blank', 'noopener,noreferrer')
                }
              }}
              className="text-[#f5efe6] hover:text-[#d7a76c] transition-colors flex items-center cursor-pointer"
              aria-label="GitHub Profile"
              title="github.com/NamanOG"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
