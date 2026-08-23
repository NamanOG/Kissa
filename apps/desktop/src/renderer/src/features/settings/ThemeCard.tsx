import React, { memo } from 'react'
import { ThemeDefinition } from './themes'
import { cn } from '@renderer/utils/cn'

export interface ThemeCardProps {
  theme: ThemeDefinition
  isSelected: boolean
  onSelect: () => void
}

/**
 * Minimalist Environment Card.
 * Prioritizes the artwork and removes unnecessary framing.
 */
export const ThemeCard = memo(({ theme, isSelected, onSelect }: ThemeCardProps): React.JSX.Element => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col items-center text-left cursor-pointer select-none focus:outline-none w-full"
      aria-pressed={isSelected}
      aria-label={`Select ${theme.name} atmosphere`}
    >
      <div 
        className={cn(
          "relative w-full aspect-[4/3] overflow-hidden rounded-xl transition-all duration-300 ease-out",
          isSelected 
            ? "ring-[2px] ring-[var(--accent)] ring-offset-4 ring-offset-[var(--deck-bg)] scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.5)]" 
            : "opacity-60 group-hover:opacity-100 group-hover:scale-[1.02] shadow-md border border-[var(--panel-border)]"
        )}
      >
        <img
          src={theme.image}
          alt={theme.name}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </div>
      
      <div className="mt-3 text-center">
        <h4 
          className={cn(
            "text-[11.5px] tracking-wide transition-colors duration-300",
            isSelected ? "text-[var(--on-surface)] font-semibold" : "text-[var(--muted)] group-hover:text-[var(--on-surface)] font-normal"
          )}
        >
          {theme.name}
        </h4>
      </div>
    </button>
  )
})

ThemeCard.displayName = 'ThemeCard'
