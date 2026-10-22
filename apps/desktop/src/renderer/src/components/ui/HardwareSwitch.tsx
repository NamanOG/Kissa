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
 * Kissa's one on/off switch: a slim track that fills with the room's accent when on, and a
 * small turned knob with one soft highlight and a contact shadow. No glow, no LED. Used
 * everywhere a setting turns on or off, so the app speaks one language.
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
          'group relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full p-[3px]',
          'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_2px_rgba(0,0,0,0.45)]',
          'transition-colors duration-200 ease-primary',
          checked ? 'bg-tone' : 'bg-ink/[0.12]',
          'focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink/70',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        <motion.span
          aria-hidden="true"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 40, mass: 0.6 }}
          className="block h-4 w-4 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.45),0_0_0_0.5px_rgba(0,0,0,0.25)] transition-transform duration-100 group-active:scale-95"
          style={{ background: 'radial-gradient(circle at 38% 30%, #ffffff 0%, #f1ece4 45%, #d8d0c3 100%)' }}
        />
      </button>
    )
  }
)

HardwareSwitch.displayName = 'HardwareSwitch'
