import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

/**
 * Groove layer — concentric rings that create the vinyl record's
 * characteristic groove pattern. Three zones:
 *   1. Lead-in groove (outer edge, sparse)
 *   2. Program grooves (main area, dense)
 *   3. Run-out groove (inner, sparse)
 *
 * Opacity is tuned to be subtle but visible — the reference image
 * shows clear groove lines catching light.
 */
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
              'radial-gradient(circle at center, transparent 27%, black 28%, black 94%, transparent 95%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 28%, black 94%, transparent 95%)'
          }}
        />

        {/* Run-out groove — sparser, inner zone */}
        <div
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 3px, rgba(255,255,255,0.04) 4px, transparent 5px)',
            maskImage:
              'radial-gradient(circle at center, transparent 24%, black 25%, black 28%, transparent 29%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 24%, black 25%, black 28%, transparent 29%)'
          }}
        />

        {/* Lead-in groove — sparse, outer edge */}
        <div
          className="absolute inset-0 rounded-full opacity-70"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.05) 3px, transparent 4px)',
            maskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)'
          }}
        />
      </div>
    )
  }
)

GrooveLayer.displayName = 'GrooveLayer'
