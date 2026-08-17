import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { SyncedLyrics } from '@renderer/features/lyrics'
import { Quote } from 'lucide-react'

export interface LyricsPanelProps {
  className?: string
  isLargeView?: boolean
}

/**
 * High-End Lyrics Panel.
 * Embeds Apple Music-style fluid synchronized lyrics with frosted glass styling.
 */
export const LyricsPanel = memo(({ className, isLargeView = false }: LyricsPanelProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((state) => state.currentTrack)

  return (
    <aside
      className={cn(
        'relative flex flex-col min-h-0 overflow-hidden select-none',
        'border-l border-white/[0.08] bg-[#221a17]/40 backdrop-blur-xl',
        className
      )}
      aria-label="Synchronized lyrics"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-7 pt-7 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Quote className="w-3.5 h-3.5 text-[#d7a76c]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#b7a99b]">
            LIVE LYRICS
          </span>
        </div>
        <span className="font-mono text-[9px] text-[#887b70] uppercase tracking-[0.14em]">
          {currentTrack ? 'SYNCED' : 'IDLE'}
        </span>
      </div>

      {/* Main Lyrics Viewport */}
      <div className="relative flex-1 min-h-0">
        <SyncedLyrics isLargeView={isLargeView} />
      </div>
    </aside>
  )
})

LyricsPanel.displayName = 'LyricsPanel'
