import React from 'react'
import { cn } from '@renderer/utils/cn'

export interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppLayout = React.forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-full w-full min-w-0 overflow-hidden bg-transparent text-foreground select-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppLayout.displayName = 'AppLayout'
