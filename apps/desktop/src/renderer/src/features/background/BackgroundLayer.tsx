import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
export interface BackgroundLayerProps extends React.HTMLAttributes<HTMLDivElement> {}
export const BackgroundLayer = memo(
  React.forwardRef<HTMLDivElement, BackgroundLayerProps>(
    ({ className, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            'absolute inset-0 w-full h-full pointer-events-none transform-gpu',
            className
          )}
          {...props}
        >
          {' '}
          {children}{' '}
        </div>
      )
    }
  )
)
BackgroundLayer.displayName = 'BackgroundLayer'
