import React from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Quote, Settings, HelpCircle, Keyboard, Minimize2, Maximize2, Disc3, BookOpen } from 'lucide-react'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { TurntableIcon } from './TurntableIcon'

import { useStudyStore } from '@renderer/stores/studyStore'
import { motion, useReducedMotion } from 'framer-motion'
import { useT } from '@renderer/i18n'
import { useGuideStore } from '@renderer/features/onboarding/guideStore'
import { brandMarkSrc, brandMarkSrcSet } from '@renderer/utils/brandMark'

/** Marks the open view. One element, shared across the three destinations, so it glides. */
function NavMarker(): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      layoutId="kissa-nav-marker"
      aria-hidden="true"
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
      className="absolute left-0 top-[30%] h-[40%] w-[3px] rounded-r-full bg-tone"
    />
  )
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Integrated Hardware Navigation Panel.
 * Functions as the left side of the physical receiver chassis.
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, ...props }, ref) => {
    const t = useT()
    const activeView = usePlayerStore((s) => s.activeView)
    const setActiveView = usePlayerStore((s) => s.setActiveView)
    const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
    const toggleSettings = usePlayerStore((s) => s.toggleSettings)
    const isOnboardingOpen = usePlayerStore((s) => s.isOnboardingOpen)
    const guideHasNew = useGuideStore((s) => s.hasNew)
    const setIsOnboardingOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
    const isKeyboardHelpOpen = usePlayerStore((s) => s.isKeyboardHelpOpen)
    const toggleKeyboardHelp = usePlayerStore((s) => s.toggleKeyboardHelp)
    const isMiniPlayer = usePlayerStore((s) => s.isMiniPlayer)
    const isEditionEditorOpen = useEditionsStore((s) => s.isEditorOpen)
    const showEditionEditor = useEditionsStore((s) => s.showEditor)
    const hasUpdateAvailable = usePlayerStore((s) => s.hasUpdateAvailable)

    // A small mark on Settings while a newer Kissa is waiting (download or Store update).
    React.useEffect(() => {
      const api = window.electron
      const apply = (state: string | undefined): void =>
        usePlayerStore.getState().setHasUpdateAvailable(state === 'available' || state === 'downloaded')
      void api?.getUpdateStatus?.().then((s) => apply(s?.state)).catch(() => {})
      return api?.onUpdateStatusChanged?.((s) => apply(s.state))
    }, [])
    const isStudying = useStudyStore((s) => s.active !== null)

    return (
      <aside
        ref={ref}
        className={cn(
          'z-40 flex flex-col items-center py-6 select-none transition-[background-color,border-color,box-shadow,transform] duration-ui ease-primary transform-gpu will-change-transform border overflow-hidden',
          'my-4 ml-4 mr-2 h-[calc(100%-32px)] w-[68px] min-[900px]:w-[76px] shrink-0 rounded-[38px] backdrop-blur-2xl backdrop-saturate-[1.6]',
          // A narrow window uses CompactTopBar instead.
          'max-[899px]:hidden',
          className
        )}
        style={{
          // The same glass as the dock, so the frame of the app is one material.
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'color-mix(in srgb, var(--panel-bg) 52%, transparent)',
          boxShadow:
            '0 24px 60px -24px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)'
        }}
        {...props}
      >
        <nav className="flex flex-col items-center space-y-4 [@media(max-height:760px)]:space-y-0 w-full">
          <button
            type="button"
            onClick={() => setActiveView('deck')}
            aria-current={activeView === 'deck' ? 'page' : undefined}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-1.5 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              activeView === 'deck' ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.deckTitle')}
          >
            {activeView === 'deck' && <NavMarker />}
            <div className={cn("relative w-7 h-7 min-[900px]:w-8 min-[900px]:h-8 rounded-full overflow-hidden shadow-sm transition-opacity", activeView === 'deck' ? "border border-white/20 opacity-100" : "border border-white/5 opacity-60")}>
              <img src={brandMarkSrc} srcSet={brandMarkSrcSet} sizes="(min-width: 900px) 30px, 26px" alt="Kissa" className="w-full h-full object-cover" draggable={false} />
            </div>
            <span className="text-[11px] min-[900px]:text-[11.5px] font-medium mt-0.5">
              {t('nav.deck')}
            </span>
          </button>

          <button
            type="button"
            data-tour="nav-lyrics"
            onClick={() => setActiveView('lyrics')}
            aria-current={activeView === 'lyrics' ? 'page' : undefined}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              activeView === 'lyrics' ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.lyricsTitle')}
          >
            {activeView === 'lyrics' && <NavMarker />}
            <Quote className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={activeView === 'lyrics' ? 2 : 1.5} />
            <span className="text-[11px] min-[900px]:text-[11.5px] font-medium">
              {t('nav.lyrics')}
            </span>
          </button>

          <button
            type="button"
            data-tour="nav-shelf"
            onClick={() => setActiveView('shelf')}
            aria-current={activeView === 'shelf' ? 'page' : undefined}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06] group",
              activeView === 'shelf' ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.shelfTitle')}
          >
            {activeView === 'shelf' && <NavMarker />}
            <Disc3 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4 transition-transform duration-200 ease-out group-hover:rotate-[15deg]" strokeWidth={activeView === 'shelf' ? 2 : 1.5} />
            <span className="text-[11px] min-[900px]:text-[11.5px] font-medium">
              {t('nav.shelf')}
            </span>
          </button>
          <button
            type="button"
            data-tour="nav-focus"
            onClick={() => setActiveView('study')}
            aria-current={activeView === 'study' ? 'page' : undefined}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              activeView === 'study' ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={isStudying ? t('nav.focusRunning') : t('nav.focusTitle')}
          >
            {activeView === 'study' && <NavMarker />}
            <span className="relative">
              <BookOpen className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={activeView === 'study' ? 2 : 1.5} />
              {isStudying && (
                <span aria-hidden="true" className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-tone" />
              )}
            </span>
            <span className="text-[11px] min-[900px]:text-[11.5px] font-medium">
              {t('nav.focus')}
            </span>
          </button>
        </nav>

        <div className="mt-auto w-full flex flex-col items-center gap-2 [@media(max-height:760px)]:gap-0">
          <button
            type="button"
            onClick={showEditionEditor}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              isEditionEditorOpen ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={`${t('nav.turntable')} (E)`}
            aria-label={t('nav.turntable')}
            aria-expanded={isEditionEditorOpen}
          >
            {isEditionEditorOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-tone shadow-[0_0_8px_var(--accent)]" />
            )}
            <TurntableIcon className="w-4 h-4" strokeWidth={isEditionEditorOpen ? 2 : 1.5} />
          </button>

          <button
            type="button"
            onClick={() => usePlayerStore.getState().toggleMiniPlayer()}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              isMiniPlayer ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.mini')}
            aria-label={t('nav.mini')}
          >
            {isMiniPlayer && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-tone shadow-[0_0_8px_var(--accent)]" />
            )}
            {isMiniPlayer ? (
              <Maximize2 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isMiniPlayer ? 2 : 1.5} />
            ) : (
              <Minimize2 className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isMiniPlayer ? 2 : 1.5} />
            )}
          </button>

          <button
            type="button"
            data-tour="nav-guide"
            onClick={() => setIsOnboardingOpen(true)}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              isOnboardingOpen ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.guide')}
            aria-label={guideHasNew ? `${t('nav.guide')}. ${t('guide.new.badge')}` : t('nav.guide')}
          >
            {isOnboardingOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-tone shadow-[0_0_8px_var(--accent)]" />
            )}
            <HelpCircle className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isOnboardingOpen ? 2 : 1.5} />
            {guideHasNew && !isOnboardingOpen && (
              <span
                aria-hidden="true"
                data-testid="guide-new-dot"
                className="absolute top-2.5 left-1/2 ml-1.5 h-1.5 w-1.5 rounded-full bg-tone shadow-[0_0_6px_var(--accent)]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={toggleKeyboardHelp}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06]",
              isKeyboardHelpOpen ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.keys')}
            aria-label={t('nav.keys')}
          >
            {isKeyboardHelpOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-tone shadow-[0_0_8px_var(--accent)]" />
            )}
            <Keyboard className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4" strokeWidth={isKeyboardHelpOpen ? 2 : 1.5} />
          </button>

          <button
            type="button"
            onClick={toggleSettings}
            className={cn(
              "relative w-full flex flex-col items-center justify-center py-3 gap-2 cursor-pointer transition-colors active:scale-95 outline-none focus-visible:text-ink focus-visible:bg-ink/[0.06] group",
              isSettingsOpen ? "text-tone" : "text-dim hover:text-ink"
            )}
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
          >
            {isSettingsOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[40%] rounded-r-full bg-tone shadow-[0_0_8px_var(--accent)]" />
            )}
            <div className="relative">
              <Settings className="w-4 h-4 min-[900px]:w-4 min-[900px]:h-4 transition-transform duration-200 ease-out group-hover:rotate-[20deg]" strokeWidth={isSettingsOpen ? 2 : 1.5} />
              {hasUpdateAvailable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-tone shadow-[0_0_8px_var(--accent)]" />
              )}
            </div>
          </button>
        </div>
      </aside>

    )
  }
)

Sidebar.displayName = 'Sidebar'

