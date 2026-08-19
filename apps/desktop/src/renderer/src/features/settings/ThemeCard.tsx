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
            ? "ring-[1.5px] ring-white/70 ring-offset-4 ring-offset-[#1a1715] scale-[1.02] shadow-[0_8px_20px_rgba(0,0,0,0.4)]" 
            : "opacity-50 group-hover:opacity-100 group-hover:scale-[1.02] shadow-md border border-white/[0.05]"
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
      
      <div className="mt-4 text-center">
        <h4 
          className={cn(
            "text-[11.5px] tracking-wide transition-colors duration-300",
            isSelected ? "text-[#f5efe6] font-medium" : "text-[#887b70] font-normal"
          )}
        >
          {theme.name}
        </h4>
      </div>
    </button>
  )
})

ThemeCard.displayName = 'ThemeCard'
