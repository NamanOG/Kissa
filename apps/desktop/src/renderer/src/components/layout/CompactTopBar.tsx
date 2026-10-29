import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { brandMarkSrc, brandMarkSrcSet } from '@renderer/utils/brandMark'
import { TurntableIcon } from './TurntableIcon'
import { useT, type MessageKey, tl } from '@renderer/i18n'

type ActiveView = 'deck' | 'lyrics' | 'shelf' | 'study'

const VIEWS: { id: ActiveView; label: MessageKey; title: string }[] = [
  { id: 'deck', label: 'nav.deck', title: 'Deck' },
  { id: 'lyrics', label: 'nav.lyrics', title: 'Live synced lyrics' },
  { id: 'shelf', label: 'nav.shelf', title: 'My records' },
  { id: 'study', label: 'nav.focus', title: 'Focus Room' }
]

/**
 * Navigation for a narrow window (a Snap half of the screen). It sits in the title-bar row,
 * beside the Windows caption buttons, so the deck keeps the whole height below it.
 * The wide layout keeps the side rail; this bar is hidden there.
 */
export function CompactTopBar({ className }: { className?: string }): React.JSX.Element {
  const t = useT()
  const reduceMotion = useReducedMotion()
  const activeView = usePlayerStore((s) => s.activeView)
  const setActiveView = usePlayerStore((s) => s.setActiveView)
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
  const toggleSettings = usePlayerStore((s) => s.toggleSettings)
  const hasUpdateAvailable = usePlayerStore((s) => s.hasUpdateAvailable)
  const isEditorOpen = useEditionsStore((s) => s.isEditorOpen)
  const showEditor = useEditionsStore((s) => s.showEditor)
  const isStudying = useStudyStore((s) => s.active !== null)

  return (
    <header
      className={cn(
        // Leaves 138 px on the right for the Windows caption buttons (title bar overlay).
        'relative z-[60] flex h-11 shrink-0 items-center gap-1 pl-3 pr-[146px] app-region-drag select-none',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setActiveView('deck')}
        className="app-region-no-drag mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-tone/70"
        title="Kissa"
        aria-label="Kissa, back to the deck"
      >
        <img
          src={brandMarkSrc}
          srcSet={brandMarkSrcSet}
          sizes="24px"
          alt=""
          draggable={false}
          className="h-6 w-6 rounded-full object-cover ring-1 ring-white/15"
        />
      </button>

      <nav aria-label={tl('a11y.views')} className="app-region-no-drag flex min-w-0 items-center gap-0.5">
        {VIEWS.map((v) => {
          const on = activeView === v.id
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveView(v.id)}
              aria-current={on ? 'page' : undefined}
              title={v.id === 'study' && isStudying ? 'Focus Room (session running)' : v.title}
              className={cn(
                'relative h-8 shrink-0 rounded-[10px] px-3 text-[12.5px] font-medium outline-none transition-colors duration-ui ease-primary',
                'focus-visible:ring-2 focus-visible:ring-tone/70',
                on ? 'text-ink' : 'text-dim hover:text-ink'
              )}
            >
              {on && (
                <motion.span
                  layoutId="kissa-compact-nav"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[10px] bg-ink/[0.09] ring-1 ring-inset ring-ink/[0.06]"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative">{t(v.label)}</span>
              {v.id === 'study' && isStudying && (
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-tone" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="app-region-no-drag ml-auto flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={showEditor}
          aria-label={t('nav.turntable')}
          aria-expanded={isEditorOpen}
          title={`${t('nav.turntable')} (E)`}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-[10px] outline-none transition-colors duration-ui ease-primary focus-visible:ring-2 focus-visible:ring-tone/70',
            isEditorOpen ? 'bg-ink/[0.09] text-tone' : 'text-dim hover:bg-ink/[0.06] hover:text-ink'
          )}
        >
          <TurntableIcon className="h-4 w-4" strokeWidth={isEditorOpen ? 2 : 1.6} />
        </button>
        <button
          type="button"
          onClick={toggleSettings}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-[10px] outline-none transition-colors duration-ui ease-primary focus-visible:ring-2 focus-visible:ring-tone/70',
            isSettingsOpen ? 'bg-ink/[0.09] text-tone' : 'text-dim hover:bg-ink/[0.06] hover:text-ink'
          )}
        >
          <Settings className="h-4 w-4" strokeWidth={isSettingsOpen ? 2 : 1.6} />
          {hasUpdateAvailable && (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-tone" />
          )}
        </button>
      </div>
    </header>
  )
}
