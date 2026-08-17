import React from 'react'
import { cn } from '@renderer/utils/cn'

interface TypographyProps extends React.HTMLAttributes<
  HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement
> {
  as?: React.ElementType
}

export const Display = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ className, as: Component = 'h1', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-5xl font-extrabold tracking-tight lg:text-7xl font-sans', className)}
        {...props}
      />
    )
  }
)
Display.displayName = 'Display'

export const Headline = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ className, as: Component = 'h2', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-3xl font-bold tracking-tight lg:text-4xl font-sans', className)}
        {...props}
      />
    )
  }
)
Headline.displayName = 'Headline'

export const Title = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-xl font-semibold tracking-tight font-sans', className)}
        {...props}
      />
    )
  }
)
Title.displayName = 'Title'

export const Body = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ className, as: Component = 'p', ...props }, ref) => {
    return (
      <Component ref={ref} className={cn('text-base leading-7 font-sans', className)} {...props} />
    )
  }
)
Body.displayName = 'Body'

export const Caption = React.forwardRef<HTMLSpanElement, TypographyProps>(
  ({ className, as: Component = 'span', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-sm text-muted-foreground font-sans', className)}
        {...props}
      />
    )
  }
)
Caption.displayName = 'Caption'
