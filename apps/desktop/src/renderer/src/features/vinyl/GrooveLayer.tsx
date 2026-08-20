import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

export const GrooveLayer = memo(
  ({ className, style, size = '100%', ...props }: VinylLayerProps): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none', className)}
        style={{
          width: size,
          height: size,
          ...style
        }}
        {...props}
      >
        {/* Program grooves — dense music area (main visible grooves) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, rgba(255,255,255,0.03) 0.5px, transparent 1px, rgba(255,255,255,0.02) 1.5px, transparent 2px)',
            maskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 94%, transparent 95%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 94%, transparent 95%)'
          }}
        />

        {/* Run-out groove — sparser, inner zone */}
        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 3px, rgba(255,255,255,0.03) 4px, transparent 5px)',
            maskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 20%, transparent 21%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 20%, transparent 21%)'
          }}
        />

        {/* Lead-in groove — sparse, outer edge */}
        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.04) 3px, transparent 4px)',
            maskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)'
          }}
        />

        {/* Physical SVG groove rings catching light */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.15" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.15" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.18" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.15" />
        </svg>
      </div>
    )
  }
)

GrooveLayer.displayName = 'GrooveLayer'
