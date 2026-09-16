import React, { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import { useMechanicalTick } from '@renderer/hooks/useMechanicalTick'

export interface HardwareSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Precision physical audio equipment rocker/slide switch.
 * Features a milled recessed chassis well, a tactile actuator,
 * and a micro-jewel LED indicator that engages on active state.
 */
export const HardwareSwitch = memo(
  ({
    checked,
    onChange,
    disabled = false,
    className,
    'aria-label': ariaLabel
  }: HardwareSwitchProps): React.JSX.Element => {
    const playTick = useMechanicalTick()

    const handleToggle = useCallback(() => {
      if (disabled) return
      playTick()
      onChange(!checked)
    }, [checked, disabled, onChange, playTick])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleToggle()
        }
      },
      [handleToggle]
    )

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[5px] p-[2px]',
          'bg-[#0e0a08] border border-black/70 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.85),0_0.5px_0.5px_rgba(255,255,255,0.04)]',
          'transition-colors duration-micro ease-primary',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        {/* Recessed well track highlight */}
        <div
          className="absolute inset-[2px] rounded-[3px] pointer-events-none transition-colors duration-micro"
          style={{
            backgroundColor: checked ? 'rgba(224, 142, 69, 0.08)' : 'transparent'
          }}
        />

        {/* Sliding Actuator */}
        <motion.div
          animate={{
            x: checked ? 18 : 0
          }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 38,
            mass: 0.6
          }}
          className={cn(
            'relative h-4.5 w-5 rounded-[3px] border border-black/80 flex items-center justify-center',
            'bg-gradient-to-b from-[#2e241e] via-[#201813] to-[#140e0b]',
            'shadow-[0_1px_2.5px_rgba(0,0,0,0.8),inset_0_0.6px_0.6px_rgba(255,255,255,0.1),inset_0_-0.6px_0.6px_rgba(0,0,0,0.5)]',
            'group-active:scale-[0.97] transition-transform duration-instant'
          )}
        >
          {/* Micro Pinhole Jewel LED */}
          <div
            className="w-1.5 h-1.5 rounded-full border border-black/80 transition-colors duration-micro ease-primary"
            style={{
              backgroundColor: checked ? 'var(--accent)' : '#16110e',
              boxShadow: checked ? '0 0 6px var(--accent)' : 'none'
            }}
          />
        </motion.div>
      </button>
    )
  }
)

HardwareSwitch.displayName = 'HardwareSwitch'
