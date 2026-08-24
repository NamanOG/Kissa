import React from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Quote, Settings, HelpCircle, Keyboard, ListMusic, Minimize2, Maximize2, Disc3 } from 'lucide-react'
import phonoLogo from '@renderer/media/phono_logo.png'

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Minimalist Vertical Navigation Rail.
 * The Kissa emblem serves as the primary Home / Turntable Deck button.
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, ...props }, ref) => {
    const activeView = usePlayerStore((s) => s.activeView)
    const setActiveView = usePlayerStore((s) => s.setActiveView)
    const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
    const toggleSettings = usePlayerStore((s) => s.toggleSettings)
    const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
    const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
    const isKeyboardHelpOpen = usePlayerStore((s) => s.isKeyboardHelpOpen)
    const toggleKeyboardHelp = usePlayerStore((s) => s.toggleKeyboardHelp)
    const isMiniPlayer = usePlayerStore((s) => s.isMiniPlayer)
    const theme = usePlayerStore((s) => s.theme)
    const updateAvailable = usePlayerStore((s) => s.updateAvailable)

    return (
      <aside
        ref={ref}
        className={cn(
          'z-40 m-3 flex h-[calc(100%-1.5rem)] w-[60px] shrink-0 flex-col items-center rounded-[1.25rem] py-5 select-none transition-colors transform-gpu will-change-transform border',
          className
        )}
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          boxShadow: 'var(--panel-shadow)'
        }}
        {...props}
      >
        {/* Navigation Items */}
        <nav className="flex flex-col items-center space-y-5 w-full px-2">
          {/* Primary Home / Turntable Deck View (Brand Logo Button) */}
          <button
            aria-label="Home / Turntable Deck View"
            type="button"
            onClick={() => setActiveView('deck')}
            className="group relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95"
            title="Kissa (Home Deck)"
          >
            {/* Subtle Active Indicator */}
            {activeView === 'deck' && (
              <div
                className="absolute inset-0 rounded-full transition-all border border-white/[0.08] bg-white/[0.03]"
              />
            )}
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/[0.14] shadow-md group-hover:scale-105 transition-transform">
              <img
                src={phonoLogo}
                alt="Kissa"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </button>

          {/* Apple Music Synced Lyrics View Button */}
          <button
            aria-label="Live Synced Lyrics"
            type="button"
            onClick={() => setActiveView('lyrics')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all group"
            title="Live Synced Lyrics"
          >
            {activeView === 'lyrics' && (
              <div
                className="absolute inset-0 rounded-full transition-all border border-[var(--on-surface)]/[0.08] bg-[var(--on-surface)]/[0.03]"
              />
            )}
            <Quote
              className={cn(
                'w-5 h-5 transition-colors',
                activeView === 'lyrics' ? 'text-[var(--accent)]' : 'text-[var(--muted)] group-hover:text-[var(--on-surface)]'
              )}
              strokeWidth={1.75}
            />
            {activeView === 'lyrics' && (
              <div
                className="absolute w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
              />
            )}
          </button>


          {/* Record Shelf Button */}
          <button
            aria-label="My Records Shelf"
            type="button"
            onClick={() => setActiveView('shelf')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all group mt-2"
            title="My Records"
          >
            {activeView === 'shelf' && (
              <div
                className="absolute inset-0 rounded-full transition-all border border-[var(--on-surface)]/[0.08] bg-[var(--on-surface)]/[0.03]"
              />
            )}
            <Disc3
              className={cn(
                'w-5 h-5 transition-colors',
                activeView === 'shelf' ? 'text-[var(--accent)]' : 'text-[var(--muted)] group-hover:text-[var(--on-surface)]'
              )}
              strokeWidth={1.75}
            />
            {activeView === 'shelf' && (
              <div className="absolute w-1.5 h-1.5 rounded-full mt-7 bg-[var(--accent)]" />
            )}
          </button>
        </nav>

        {/* Bottom: Guide / Help & Settings */}
        <div className="mt-auto w-full px-2 flex flex-col items-center gap-2">
          {/* Mini Player Mode Button */}
          <button
            aria-label="Toggle Mini Player"
            type="button"
            onClick={() => usePlayerStore.getState().toggleMiniPlayer()}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-[0.96] mb-2',
              isMiniPlayer
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                : 'text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--accent)]/[0.05]'
            )}
            style={isMiniPlayer ? { boxShadow: '0 0 12px var(--accent)' } : {}}
            title="Toggle Mini Player"
          >
            {isMiniPlayer ? (
              <Maximize2 className="w-5 h-5" strokeWidth={1.75} />
            ) : (
              <Minimize2 className="w-5 h-5" strokeWidth={1.75} />
            )}
          </button>

          {/* Welcome Guide / Introduction Button */}
          <button
            aria-label="Welcome Guide & Overview"
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-[0.96]',
              isOnboardingOpen
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                : 'text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--accent)]/[0.05]'
            )}
            style={isOnboardingOpen ? { boxShadow: '0 0 12px var(--accent)' } : {}}
            title="Open Welcome Guide & Instructions"
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.75} />
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            aria-label="Keyboard Shortcuts"
            type="button"
            onClick={toggleKeyboardHelp}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-[0.96]',
              isKeyboardHelpOpen
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                : 'text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--accent)]/[0.05]'
            )}
            style={isKeyboardHelpOpen ? { boxShadow: '0 0 12px var(--accent)' } : {}}
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-5 h-5" strokeWidth={1.75} />
          </button>

          {/* Settings Button */}
          <button
            aria-label="Settings"
            type="button"
            onClick={toggleSettings}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-[0.96]',
              isSettingsOpen
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                : 'text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--accent)]/[0.05]'
            )}
            style={isSettingsOpen ? { boxShadow: '0 0 12px var(--accent)' } : {}}
            title="Open Preferences & Environments"
          >
            <div className="relative">
              <Settings className="w-5 h-5" strokeWidth={1.75} />
              {updateAvailable && !isSettingsOpen && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2" style={{ borderColor: 'var(--panel-bg)' }} />
              )}
            </div>
          </button>
        </div>
      </aside>

    )
  }
)

Sidebar.displayName = 'Sidebar'
