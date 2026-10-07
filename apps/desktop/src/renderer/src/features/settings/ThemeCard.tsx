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
          "relative w-full aspect-[4/3] overflow-hidden rounded-xl transition-transform duration-ui ease-primary will-change-transform",
          isSelected 
            ? "ring-[2.5px] ring-tone ring-offset-2 ring-offset-[#141216] scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.6)]" 
            : "opacity-70 group-hover:opacity-100 shadow-md border border-panel-line"
        )}
      >
        {theme.id === 'adaptive' ? (
          // Adaptive has no room photograph: its light comes from whatever
          // album is playing. Shown as a sleeve casting its colours on the wall.
          <div aria-hidden="true" className="relative w-full h-full overflow-hidden bg-[#0b0a09]">
            <div className="absolute -left-[18%] -top-[25%] h-[95%] w-[70%] rounded-full bg-[#c8553d] opacity-80 blur-2xl" />
            <div className="absolute -right-[22%] top-[5%] h-[95%] w-[70%] rounded-full bg-[#3d6fc8] opacity-70 blur-2xl" />
            <div className="absolute -bottom-[40%] left-[18%] h-[85%] w-[70%] rounded-full bg-[#d9a441] opacity-70 blur-2xl" />
            <div className="absolute inset-0 bg-black/35" />
            <div
              className="absolute left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
              style={{ background: 'conic-gradient(from 210deg, #c8553d, #d9a441, #3d6fc8, #c8553d)' }}
            />
          </div>
        ) : (
          <img
            src={theme.image}
            alt={theme.name}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
        )}
      </div>
      
      <div className="mt-2 text-center">
        <h4 
          className={cn(
            "text-[12px] tracking-wide transition-colors duration-micro ease-primary",
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
