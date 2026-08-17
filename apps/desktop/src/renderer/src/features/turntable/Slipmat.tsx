import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface SlipmatProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: string
}

/**
 * Premium anti-static felt/rubber slipmat sitting on the platter beneath the vinyl.
 */
export const Slipmat = memo(({ className, style, size = '92%', ...props }: SlipmatProps): React.JSX.Element => {
  return (
    <div
      className={cn('absolute rounded-full pointer-events-none select-none', className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="slipmat-felt">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.06 0" />
            <feBlend mode="overlay" in2="SourceGraphic" />
          </filter>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="49"
          fill="#111113"
          filter="url(#slipmat-felt)"
          stroke="rgba(0,0,0,0.8)"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  )
})

Slipmat.displayName = 'Slipmat'
