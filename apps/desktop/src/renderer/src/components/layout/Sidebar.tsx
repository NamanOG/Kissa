import React from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Quote, Settings, HelpCircle, Keyboard } from 'lucide-react'
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
    const theme = usePlayerStore((s) => s.theme)

    const isLightTheme = theme === 'sunday-morning' || theme === 'concrete-vinyl'

    return (
      <aside
        ref={ref}
        className={cn(
          'z-40 m-3 flex h-[calc(100%-1.5rem)] w-[60px] shrink-0 flex-col items-center rounded-[1.25rem] py-5 select-none backdrop-blur-xl transition-colors',
          isLightTheme
            ? 'border border-black/[0.08] bg-[#f0e7d6]/70 shadow-[0_18px_46px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]'
            : 'border border-white/[0.08] bg-[#2a211d]/55 shadow-[0_18px_46px_rgba(14,9,7,0.22),inset_0_1px_0_rgba(255,255,255,0.09)]',
          className
        )}
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
            {/* Active Glow Ring */}
            {activeView === 'deck' && (
              <div
                className={cn(
                  'absolute -inset-1 rounded-full animate-pulse transition-all',
                  isLightTheme
                    ? 'border border-[#b45309]/80 bg-[#b45309]/[0.1] shadow-[0_0_14px_rgba(180,83,9,0.3)]'
                    : 'border border-[#d7a76c]/80 bg-[#d7a76c]/[0.1] shadow-[0_0_14px_rgba(215,167,108,0.35)]'
                )}
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
                className={cn(
                  'absolute inset-0 rounded-full transition-all',
                  isLightTheme
                    ? 'border border-[#b45309]/80 bg-[#b45309]/[0.08] shadow-[0_0_12px_rgba(180,83,9,0.25)]'
                    : 'border border-[#d7a76c]/80 bg-[#d7a76c]/[0.08] shadow-[0_0_12px_rgba(215,167,108,0.3)]'
                )}
              />
            )}
            <Quote
              className={cn(
                'w-5 h-5 transition-colors',
                activeView === 'lyrics'
                  ? isLightTheme ? 'text-[#b45309]' : 'text-[#dfb47e]'
                  : isLightTheme ? 'text-[#7a6c5f] group-hover:text-[#181411]' : 'text-[#a99b90] group-hover:text-[#f5efe6]'
              )}
              strokeWidth={1.75}
            />
            {activeView === 'lyrics' && (
              <div
                className={cn(
                  'absolute w-1.5 h-1.5 rounded-full',
                  isLightTheme ? 'bg-[#b45309]' : 'bg-[#dfb47e]'
                )}
              />
            )}
          </button>
        </nav>

        {/* Bottom: Guide / Help & Settings */}
        <div className="mt-auto w-full px-2 flex flex-col items-center gap-2">
          {/* Welcome Guide / Introduction Button */}
          <button
            aria-label="Welcome Guide & Overview"
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-[0.96]',
              isOnboardingOpen
                ? isLightTheme
                  ? 'bg-[#b45309]/15 text-[#b45309] border border-[#b45309]/40 shadow-[0_0_12px_rgba(180,83,9,0.2)]'
                  : 'bg-[#d7a76c]/20 text-[#d7a76c] border border-[#d7a76c]/40 shadow-[0_0_12px_rgba(215,167,108,0.25)]'
                : isLightTheme
                  ? 'text-[#7a6c5f] hover:text-[#181411] hover:bg-black/[0.05]'
                  : 'text-[#a99b90] hover:text-[#f5efe6] hover:bg-white/[0.06]'
            )}
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
                ? isLightTheme
                  ? 'bg-[#b45309]/15 text-[#b45309] border border-[#b45309]/40 shadow-[0_0_12px_rgba(180,83,9,0.2)]'
                  : 'bg-[#d7a76c]/20 text-[#d7a76c] border border-[#d7a76c]/40 shadow-[0_0_12px_rgba(215,167,108,0.25)]'
                : isLightTheme
                  ? 'text-[#7a6c5f] hover:text-[#181411] hover:bg-black/[0.05]'
                  : 'text-[#a99b90] hover:text-[#f5efe6] hover:bg-white/[0.06]'
            )}
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
                ? isLightTheme
                  ? 'bg-[#b45309]/15 text-[#b45309] border border-[#b45309]/40 shadow-[0_0_12px_rgba(180,83,9,0.2)]'
                  : 'bg-[#d7a76c]/20 text-[#d7a76c] border border-[#d7a76c]/40 shadow-[0_0_12px_rgba(215,167,108,0.25)]'
                : isLightTheme
                  ? 'text-[#7a6c5f] hover:text-[#181411] hover:bg-black/[0.05]'
                  : 'text-[#a99b90] hover:text-[#f5efe6] hover:bg-white/[0.06]'
            )}
            title="Open Preferences & Environments"
          >
            <Settings className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
      </aside>
    )
  }
)

Sidebar.displayName = 'Sidebar'
