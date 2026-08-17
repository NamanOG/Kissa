import React, { memo } from 'react'
import { ThemeDefinition } from './themes'
import { cn } from '@renderer/utils/cn'

export interface ThemeAtmospherePreviewProps {
  theme: ThemeDefinition
  isSelected?: boolean
  className?: string
}

/**
 * Editorial Listening Room Visual Preview.
 * Renders authentic, architectural vinyl listening room visuals
 * with smooth lighting gradients and active indicators.
 */
export const ThemeAtmospherePreview = memo(
  ({ theme, isSelected, className }: ThemeAtmospherePreviewProps): React.JSX.Element => {
    return (
      <div
        className={cn(
          'relative w-full aspect-[16/10] rounded-xl overflow-hidden select-none transition-all duration-300',
          'border shadow-inner bg-[#141210]',
          isSelected
            ? 'border-[#d7a76c] shadow-[0_4px_20px_rgba(215,167,108,0.25)] ring-1 ring-[#d7a76c]/40'
            : 'border-white/[0.12] hover:border-white/[0.24]',
          className
        )}
      >
        {/* Photorealistic Environment Image */}
        <img
          src={theme.image}
          alt={theme.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false}
          loading="lazy"
        />

        {/* Ambient Darkening Gradient Overlay for Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        {/* Top-Left: Number Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d7a76c]" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#f5efe6]">
            ENV {theme.number}
          </span>
        </div>

        {/* Top-Right: Active Indicator Badge */}
        {isSelected && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d7a76c] text-[#1a1410] shadow-[0_2px_10px_rgba(215,167,108,0.5)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a1410] animate-pulse" />
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] font-bold">
              ACTIVE
            </span>
          </div>
        )}
      </div>
    )
  }
)

ThemeAtmospherePreview.displayName = 'ThemeAtmospherePreview'
