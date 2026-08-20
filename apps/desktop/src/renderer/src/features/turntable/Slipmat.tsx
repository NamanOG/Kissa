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
          <radialGradient id="slipmat-felt-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1e22" />
            <stop offset="60%" stopColor="#151518" />
            <stop offset="95%" stopColor="#0d0d0f" />
            <stop offset="100%" stopColor="#08080a" />
          </radialGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="49"
          fill="url(#slipmat-felt-grad)"
          stroke="rgba(0,0,0,0.85)"
          strokeWidth="0.5"
        />
        {/* Subtle acoustic alignment guide ring */}
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  )
})

Slipmat.displayName = 'Slipmat'
