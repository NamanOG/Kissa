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
          "relative w-full aspect-[4/3] overflow-hidden rounded-xl transition-transform duration-200 ease-out will-change-transform",
          isSelected 
            ? "ring-[2.5px] ring-[var(--accent)] ring-offset-2 ring-offset-[#141216] scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.6)]" 
            : "opacity-70 group-hover:opacity-100 group-hover:scale-[1.01] shadow-md border border-white/10"
        )}
      >
        <img
          src={theme.image}
          alt={theme.name}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>
      
      <div className="mt-2 text-center">
        <h4 
          className={cn(
            "text-[12px] tracking-wide transition-colors duration-150",
            isSelected ? "text-white font-bold" : "text-zinc-400 group-hover:text-white font-medium"
          )}
        >
          {theme.name}
        </h4>
      </div>
    </button>
  )
})

ThemeCard.displayName = 'ThemeCard'
