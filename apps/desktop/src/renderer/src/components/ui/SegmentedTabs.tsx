import React, { useId, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@renderer/utils/cn'

export interface SegmentedTab<T extends string> {
  id: T
  label: string
}

export interface SegmentedTabsProps<T extends string> {
  tabs: ReadonlyArray<SegmentedTab<T>>
  value: T
  onChange: (id: T) => void
  /** Accessible name for the group. */
  label: string
  /** 'tabs' switches a panel elsewhere; 'radio' picks one value of a setting. */
  kind?: 'tabs' | 'radio'
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A row of mutually exclusive choices with a selection plate that glides between them.
 * Keyboard: Left/Right (wrapping), Home and End, roving tabindex — the WAI-ARIA
 * pattern for tabs and radio groups.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  kind = 'tabs',
  size = 'md',
  className
}: SegmentedTabsProps<T>): React.JSX.Element {
  const plateId = useId()
  const reduceMotion = useReducedMotion()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const go = (index: number): void => {
    const tab = tabs[(index + tabs.length) % tabs.length]
    refs.current[(index + tabs.length) % tabs.length]?.focus()
    onChange(tab.id)
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') go(index + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') go(index - 1)
    else if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div
      role={kind === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={label}
      className={cn(
        'inline-flex select-none items-center gap-0.5 rounded-full border border-ink/[0.14] p-[3px]',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role={kind === 'tabs' ? 'tab' : 'radio'}
            {...(kind === 'tabs' ? { 'aria-selected': selected } : { 'aria-checked': selected })}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'relative cursor-pointer rounded-full font-medium outline-none transition-colors duration-micro',
              'focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60',
              size === 'md' ? 'h-7 px-4 text-[13px]' : 'h-[26px] min-w-[44px] px-3 text-[12.5px]',
              selected ? 'text-ink' : 'text-dim hover:text-ink'
            )}
          >
            {selected && (
              <motion.div
                layoutId={plateId}
                aria-hidden="true"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
                className="absolute inset-0 rounded-full bg-ink/[0.11]"
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
