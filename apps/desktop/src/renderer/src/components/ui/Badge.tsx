import React from 'react'
import { cn } from '@renderer/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  dotColor?: string // Tailwind background color class, e.g. 'bg-green-400'
  className?: string
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ children, dotColor, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1',
          'bg-gradient-to-b from-neutral-800 to-neutral-900',
          'border border-neutral-700/80',
          'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.5)]',
          className
        )}
        {...props}
      >
        {dotColor && (
          <div
            className={cn('h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]', dotColor)}
            style={{ color: 'inherit' }}
          />
        )}
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-300">
          {children}
        </span>
      </div>
    )
  }
)

Badge.displayName = 'Badge'
