import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

/**
 * Anisotropic Light Reflection on the Vinyl Grooves.
 * Creates the sweeping conical reflection beams visible in the reference image.
 * This layer remains static while the record spins beneath it.
 */
export const ReflectionLayer = memo(
  ({ className, style, size = '100%', ...props }: VinylLayerProps): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none select-none', className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        {/* Primary sweeping anisotropic highlight beam (10 o'clock to 4 o'clock) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 205deg, transparent 0deg, transparent 24deg, rgba(255,255,255,0.03) 35deg, rgba(255,255,255,0.12) 48deg, rgba(255,255,255,0.18) 58deg, rgba(255,255,255,0.1) 68deg, rgba(255,255,255,0.03) 80deg, transparent 96deg, transparent 204deg, rgba(255,255,255,0.03) 216deg, rgba(255,255,255,0.1) 228deg, rgba(255,255,255,0.16) 238deg, rgba(255,255,255,0.08) 248deg, rgba(255,255,255,0.02) 260deg, transparent 276deg)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)'
          }}
        />

        {/* Secondary cross reflection (2 o'clock to 8 o'clock) */}
        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'conic-gradient(from 25deg, transparent 0deg, transparent 130deg, rgba(255,255,255,0.03) 145deg, rgba(255,255,255,0.09) 158deg, rgba(255,255,255,0.04) 170deg, transparent 185deg, transparent 310deg, rgba(255,255,255,0.03) 325deg, rgba(255,255,255,0.08) 338deg, rgba(255,255,255,0.03) 350deg, transparent 360deg)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)'
          }}
        />

        {/* Studio top-left ambient specular wash */}
        <div
          className="absolute inset-0 rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 30% 25%, rgba(255,255,255,0.07) 0%, transparent 65%)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95%, transparent 97%)'
          }}
        />
      </div>
    )
  }
)

ReflectionLayer.displayName = 'ReflectionLayer'
