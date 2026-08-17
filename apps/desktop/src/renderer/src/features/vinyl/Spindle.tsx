import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

/**
 * 3D Machined Stainless Steel Spindle Pin.
 * Precision cylindrical pin protruding through the center spindle hole.
 */
export const Spindle = memo(({ className, style, size = '2.4%', ...props }: VinylLayerProps) => {
  return (
    <div
      className={cn('absolute z-40 pointer-events-none select-none', className)}
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        ...style
      }}
      {...props}
    >
      <svg
        className="w-full h-full drop-shadow-[2px_6px_6px_rgba(0,0,0,0.95)]"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Polished cylindrical metal gradient */}
          <linearGradient id="spindle-cylinder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#444448" />
            <stop offset="20%" stopColor="#9a9aa2" />
            <stop offset="45%" stopColor="#f0f0f8" />
            <stop offset="70%" stopColor="#b4b4be" />
            <stop offset="90%" stopColor="#5a5a60" />
            <stop offset="100%" stopColor="#2a2a2e" />
          </linearGradient>

          {/* Top domed highlight */}
          <radialGradient id="spindle-top-dome" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#e0e0e8" />
            <stop offset="80%" stopColor="#8a8a92" />
            <stop offset="100%" stopColor="#3a3a40" />
          </radialGradient>
        </defs>

        {/* Cylinder Body */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#spindle-cylinder)"
          stroke="rgba(0,0,0,0.8)"
          strokeWidth="1.5"
        />

        {/* Top Dome Reflection */}
        <circle cx="50" cy="50" r="42" fill="url(#spindle-top-dome)" />
        {/* Specular Core Ping */}
        <circle cx="44" cy="42" r="8" fill="rgba(255,255,255,0.7)" filter="blur(1px)" />
      </svg>
    </div>
  )
})

Spindle.displayName = 'Spindle'
