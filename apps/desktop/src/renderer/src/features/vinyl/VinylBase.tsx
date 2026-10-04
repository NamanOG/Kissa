import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { usePlayerStore, type VinylColor } from '@renderer/stores/playerStore'

/** Centre and rim colour of each pressing. Grooves and reflections sit on top of these. */
export const VINYL_PRESSINGS: Record<VinylColor, { name: string; inner: string; outer: string }> = {
  black: { name: 'Classic Black', inner: '#1e1e1e', outer: '#0a0a0a' },
  oxblood: { name: 'Oxblood', inner: '#641a1f', outer: '#2a090c' },
  amber: { name: 'Amber', inner: '#a85c16', outer: '#4a2506' },
  forest: { name: 'Bottle Green', inner: '#22523a', outer: '#0c2217' },
  cobalt: { name: 'Cobalt', inner: '#20468a', outer: '#0b1c3d' },
  smoke: { name: 'Smoke', inner: '#55555a', outer: '#262628' },
  match: {
    name: 'Match the Room',
    inner: 'color-mix(in srgb, var(--accent) 64%, #000)',
    outer: 'color-mix(in srgb, var(--accent) 26%, #000)'
  }
}

export const VinylBase = memo(({ className, style, size = '100%', ...props }: VinylLayerProps) => {
  const pressing = VINYL_PRESSINGS[usePlayerStore((s) => s.vinylColor)] ?? VINYL_PRESSINGS.black
  return (
    <div
      className={cn('absolute', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        className="w-full h-full pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="vinyl-base" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: pressing.inner }} />
            <stop offset="100%" style={{ stopColor: pressing.outer }} />
          </radialGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="49.5"
          fill="url(#vinyl-base)"
          className="stroke-black stroke-[0.5px]"
        />
      </svg>
    </div>
  )
})

VinylBase.displayName = 'VinylBase'
