import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@renderer/utils/cn'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'className'> {
  variant?: 'primary' | 'secondary' | 'icon' | 'circular'
  className?: string
  active?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', active = false, children, ...props }, ref) => {
    // Shared base styles for all premium buttons
    const baseStyles = cn(
      'relative flex items-center justify-center outline-none select-none',
      'transition-colors duration-200 ease-out',
      'disabled:opacity-50 disabled:pointer-events-none'
    )

    // Machined aluminium physical styling
    const materials = {
      primary: cn(
        'bg-gradient-to-b from-amber-800 to-amber-950',
        'border border-amber-500/70',
        'text-amber-300 font-mono font-bold tracking-wider text-[10px]',
        'shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(251,191,36,0.3)]',
        'hover:border-amber-400/80 hover:from-amber-700 hover:to-amber-900 hover:text-amber-200',
        // Active/Pressed State overrides via motion.button or `active` prop
        active &&
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border-amber-700 from-amber-900 to-black text-amber-500'
      ),
      secondary: cn(
        'bg-gradient-to-b from-neutral-800 to-neutral-900',
        'border border-neutral-600',
        'text-neutral-200 font-mono font-semibold tracking-wider text-[10px]',
        'shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]',
        'hover:border-neutral-500 hover:text-white',
        active &&
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border-neutral-700 from-neutral-900 to-black text-amber-400'
      ),
      icon: cn(
        'bg-transparent border border-transparent',
        'text-white/40',
        'hover:bg-white/[0.04] hover:border-white/[0.08] hover:text-white/90',
        'hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
        active && 'text-amber-400 bg-white/[0.02]'
      ),
      circular: cn(
        'rounded-full bg-neutral-900 border border-neutral-700/80',
        'shadow-[0_4px_8px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(0,0,0,0.9)]',
        'hover:border-neutral-600',
        active && 'shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] border-neutral-800'
      )
    }

    const sizes = {
      primary: 'h-8 px-5 rounded-full',
      secondary: 'h-8 px-5 rounded-full',
      icon: 'h-9 w-9 rounded-lg',
      circular: 'h-11 w-11' // Often combined with rounded-full in variants
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ y: variant !== 'icon' ? 1.5 : 0.5, scale: 0.95 }}
        className={cn(baseStyles, materials[variant], sizes[variant], className)}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
