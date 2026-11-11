import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface SlipmatProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: string
}

/**
 * The mat on the platter, under the record. Only its edge shows: a thin, clean dark ring between
 * the record and the platter's metal rim. Static.
 */
export const Slipmat = memo(({ className, style, size = '92%', ...props }: SlipmatProps): React.JSX.Element => {
  return (
    <div
      className={cn('absolute rounded-full pointer-events-none select-none', className)}
      style={{
        width: size,
        height: size,
        background: '#161618',
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style
      }}
      data-slipmat=""
      {...props}
    />
  )
})

Slipmat.displayName = 'Slipmat'
