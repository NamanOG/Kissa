import React from 'react'
import { cn } from '@renderer/utils/cn'

export interface ContentAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContentArea = React.forwardRef<HTMLDivElement, ContentAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          // flex-col: grid fills top, ControlDock pins to bottom
          'relative flex min-w-0 flex-1 flex-col overflow-hidden',
          className
        )}
        {...props}
      >
        {children}
      </main>
    )
  }
)

ContentArea.displayName = 'ContentArea'
