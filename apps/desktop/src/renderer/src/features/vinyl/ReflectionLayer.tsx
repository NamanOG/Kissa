import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

export const ReflectionLayer = memo(
  ({ className, style, size = '100%', ...props }: VinylLayerProps): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none select-none', className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        {/* Primary sweeping anisotropic highlight beam (10 o'clock to 4 o'clock) — high brilliance */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 205deg, transparent 0deg, transparent 20deg, rgba(255,245,230,0.06) 32deg, rgba(255,255,255,0.22) 46deg, rgba(255,255,255,0.36) 58deg, rgba(255,245,225,0.20) 68deg, rgba(215,167,108,0.08) 80deg, transparent 96deg, transparent 200deg, rgba(255,245,230,0.06) 212deg, rgba(255,255,255,0.20) 226deg, rgba(255,255,255,0.32) 238deg, rgba(255,245,225,0.16) 248deg, rgba(215,167,108,0.05) 262deg, transparent 278deg)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95.5%, transparent 97.5%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95.5%, transparent 97.5%)'
          }}
        />

        {/* Secondary cross reflection (2 o'clock to 8 o'clock) */}
        <div
          className="absolute inset-0 rounded-full opacity-80"
          style={{
            background:
              'conic-gradient(from 25deg, transparent 0deg, transparent 125deg, rgba(255,255,255,0.06) 140deg, rgba(255,255,255,0.18) 156deg, rgba(255,240,215,0.08) 168deg, transparent 185deg, transparent 305deg, rgba(255,255,255,0.06) 320deg, rgba(255,255,255,0.16) 336deg, rgba(255,240,215,0.06) 348deg, transparent 360deg)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95.5%, transparent 97.5%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 95.5%, transparent 97.5%)'
          }}
        />

        {/* Studio top-left ambient specular wash & overhead softbox dome light */}
        <div
          className="absolute inset-0 rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 90% 75% at 28% 22%, rgba(255,250,240,0.15) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)',
            maskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 96%, transparent 98%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 27%, black 29%, black 96%, transparent 98%)'
          }}
        />
      </div>
    )
  }
)

ReflectionLayer.displayName = 'ReflectionLayer'
