import React, { memo } from 'react'
import { ThemeDefinition } from './themes'
import { ThemeAtmospherePreview } from './ThemeAtmospherePreview'
import { cn } from '@renderer/utils/cn'

export interface ThemeCardProps {
  theme: ThemeDefinition
  isSelected: boolean
  onSelect: () => void
}

/**
 * Editorial Listening Environment Card.
 * Focuses on atmospheric presence, material hierarchy, and understated tactile states.
 */
export const ThemeCard = memo(({ theme, isSelected, onSelect }: ThemeCardProps): React.JSX.Element => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none',
        'active:scale-[0.985]',
        isSelected
          ? 'border-[#d7a76c]/70 bg-[#221c18]/80 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.08] bg-[#1a1715]/40 hover:border-white/[0.18] hover:bg-[#1f1b18]/60 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
      )}
      aria-pressed={isSelected}
      aria-label={`Select ${theme.name} environment`}
    >
      {/* Visual Atmosphere Preview (Hero) */}
      <ThemeAtmospherePreview theme={theme} isSelected={isSelected} />

      {/* Theme Title & Number */}
      <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
        <h4
          className={cn(
            'text-[13px] font-serif font-medium tracking-tight line-clamp-1 transition-colors',
            isSelected ? 'text-[#f5efe6]' : 'text-[#d6c9bb] group-hover:text-[#f5efe6]'
          )}
        >
          {theme.name}
        </h4>
        <span className="font-mono text-[9px] text-[#887b70] shrink-0 uppercase tracking-wider">
          {theme.number}
        </span>
      </div>

      {/* Sensory Description */}
      <p className="mt-1 text-[11px] leading-snug text-[#9c8e82] line-clamp-1 italic">
        {theme.description}
      </p>
    </button>
  )
})

ThemeCard.displayName = 'ThemeCard'
