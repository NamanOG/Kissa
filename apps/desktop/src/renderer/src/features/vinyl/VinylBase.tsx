import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

export const VinylBase = memo(({ className, style, size = '100%', ...props }: VinylLayerProps) => {
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
            <stop offset="0%" stopColor="#1e1e1e" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>

        {/* Main Record Body */}
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
