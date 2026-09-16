import React from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Quote, Settings, HelpCircle, Keyboard, Minimize2, Maximize2, Disc3 } from 'lucide-react'
import kissaLogo from '@renderer/media/kissa_logo.png'

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Integrated Hardware Navigation Panel.
 * Functions as the left side of the physical receiver chassis.
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
    const hasUpdateAvailable = usePlayerStore((s) => s.hasUpdateAvailable)

    return (
      <aside
        ref={ref}
        className={cn(
          'z-40 flex flex-col items-center py-6 select-none transition-[background-color,border-color,box-shadow,transform] duration-ui ease-primary transform-gpu will-change-transform border overflow-hidden',
          'my-4 ml-4 mr-2 h-[calc(100%-32px)] w-[68px] min-[900px]:w-[76px] shrink-0 rounded-[38px] backdrop-blur-2xl',
          className
        )}
        style={{
          borderColor: 'var(--panel-border)',
          backgroundColor: 'var(--panel-bg)',
          boxShadow: 'var(--panel-shadow)'
        }}
        {...props}
      >
        {/* Navigation Items */}
        <nav className="flex flex-col items-center space-y-4 w-full">
          {/* DECK */}
          <button
            type="button"
            onClick={() => setActiveView('deck')}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-1.5 cursor-pointer transition-colors active:scale-95",
              activeView === 'deck' ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Kissa (Home Deck)"
          >
            {activeView === 'deck' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <div className={cn("relative w-7 h-7 min-[900px]:w-8 min-[900px]:h-8 rounded-full overflow-hidden shadow-sm transition-opacity", activeView === 'deck' ? "border border-white/20 opacity-100" : "border border-white/5 opacity-60")}>
              <img src={kissaLogo} alt="Kissa" className="w-full h-full object-cover" draggable={false} />
            </div>
            <span className="font-mono text-[9px] min-[900px]:text-[10px] tracking-widest font-medium uppercase mt-0.5">
              Deck
            </span>
          </button>

          {/* LYRICS */}
          <button
            type="button"
            onClick={() => setActiveView('lyrics')}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95",
              activeView === 'lyrics' ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Live Synced Lyrics"
          >
            {activeView === 'lyrics' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <Quote className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={activeView === 'lyrics' ? 2 : 1.5} />
            <span className="font-mono text-[9px] min-[900px]:text-[10px] tracking-widest font-medium uppercase">
              Lyrics
            </span>
          </button>

          {/* SHELF */}
          <button
            type="button"
            onClick={() => setActiveView('shelf')}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 group",
              activeView === 'shelf' ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="My Records"
          >
            {activeView === 'shelf' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <Disc3 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4 transition-transform duration-200 ease-out group-hover:rotate-[15deg]" strokeWidth={activeView === 'shelf' ? 2 : 1.5} />
            <span className="font-mono text-[9px] min-[900px]:text-[10px] tracking-widest font-medium uppercase">
              Shelf
            </span>
          </button>
        </nav>

        {/* Bottom Panel Controls */}
        <div className="mt-auto w-full flex flex-col items-center gap-2">
          {/* Mini Player */}
          <button
            type="button"
            onClick={() => usePlayerStore.getState().toggleMiniPlayer()}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95",
              isMiniPlayer ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Toggle Mini Player"
          >
            {isMiniPlayer && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            {isMiniPlayer ? (
              <Maximize2 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isMiniPlayer ? 2 : 1.5} />
            ) : (
              <Minimize2 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isMiniPlayer ? 2 : 1.5} />
            )}
          </button>

          {/* Guide */}
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95",
              isOnboardingOpen ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Guide & Introduction"
          >
            {isOnboardingOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <HelpCircle className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isOnboardingOpen ? 2 : 1.5} />
          </button>

          {/* Keyboard Shortcuts */}
          <button
            type="button"
            onClick={toggleKeyboardHelp}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95",
              isKeyboardHelpOpen ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Keyboard Shortcuts"
          >
            {isKeyboardHelpOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <Keyboard className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isKeyboardHelpOpen ? 2 : 1.5} />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={toggleSettings}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 group",
              isSettingsOpen ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--on-surface)]"
            )}
            title="Preferences"
          >
            {isSettingsOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            )}
            <div className="relative">
              <Settings className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4 transition-transform duration-200 ease-out group-hover:rotate-[20deg]" strokeWidth={isSettingsOpen ? 2 : 1.5} />
              {hasUpdateAvailable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
              )}
            </div>
            <span className="font-mono text-[9px] min-[900px]:text-[10px] tracking-widest font-medium uppercase mt-0.5">
              Config
            </span>
          </button>
        </div>
      </aside>

    )
  }
)

Sidebar.displayName = 'Sidebar'

