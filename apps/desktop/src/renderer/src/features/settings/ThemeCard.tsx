import React, { memo } from 'react'
import { Check } from 'lucide-react'
import { ThemeDefinition } from './themes'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'
import { useT } from '@renderer/i18n'

export interface ThemeCardProps {
  theme: ThemeDefinition
  isSelected: boolean
  onSelect: () => void
}

/**
 * A room to listen in: its photograph, and its name set beneath like a caption. The chosen
 * room gets a thin ink frame and a small check, never a glow or a jump in size.
 */
export const ThemeCard = memo(({ theme, isSelected, onSelect }: ThemeCardProps): React.JSX.Element => {
  const t = useT()
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const cover = artworkUrl && !artworkUrl.includes('placeholder-album') ? artworkUrl : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex w-full cursor-pointer select-none flex-col text-left outline-none"
      aria-pressed={isSelected}
      aria-label={t('themeCard.label', { name: theme.id === 'adaptive' ? t('turntable.match') : theme.name })}
    >
      <div
        className={cn(
          'relative aspect-[3/2] w-full overflow-hidden rounded-[10px] transition-[box-shadow,opacity] duration-200',
          'group-focus-visible:shadow-[0_0_0_1.5px_var(--on-surface)]',
          isSelected
            ? 'shadow-[0_0_0_1.5px_var(--on-surface)]'
            : 'opacity-80 shadow-[0_0_0_1px_rgba(255,255,255,0.07)] group-hover:opacity-100'
        )}
      >
        {theme.id === 'adaptive' ? (
          /*
           * Adaptive has no room photograph: its light comes from whatever album is playing,
           * so the card shows that album, lighting the wall behind it.
           */
          <div aria-hidden="true" className="relative h-full w-full overflow-hidden bg-[#0d0b0a]">
            {cover ? (
              <>
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-black/30" />
                <img
                  src={cover}
                  alt=""
                  className="absolute left-1/2 top-1/2 aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] object-cover shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                  draggable={false}
                />
              </>
            ) : (
              <div className="absolute left-1/2 top-1/2 aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-ink/[0.08]" />
            )}
          </div>
        ) : (
          <img
            src={theme.image}
            alt=""
            className="pointer-events-none h-full w-full select-none object-cover"
            draggable={false}
          />
        )}
        {isSelected && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--on-surface)] text-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </div>

      <span
        className={cn(
          'mt-2 text-[12.5px] transition-colors duration-150',
          isSelected ? 'font-medium text-ink' : 'text-dim group-hover:text-ink'
        )}
      >
        {theme.id === 'adaptive' ? t('turntable.match') : theme.name}
      </span>
    </button>
  )
})

ThemeCard.displayName = 'ThemeCard'
