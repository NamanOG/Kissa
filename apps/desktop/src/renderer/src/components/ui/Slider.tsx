import React from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@renderer/utils/cn'

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number
  min?: number
  max?: number
  onChange?: (value: number) => void
  disabled?: boolean
  className?: string
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, min = 0, max = 100, onChange, disabled = false, className, ...props }, ref) => {
    const rawPercent = max > min ? ((value - min) / (max - min)) * 100 : 0
    const percentage = Number.isNaN(rawPercent)
      ? 0
      : Math.max(0, Math.min(100, rawPercent))
    const [isHovered, setIsHovered] = React.useState(false)
    const [isDragging, setIsDragging] = React.useState(false)
    const trackRef = React.useRef<HTMLDivElement>(null)

    const handlePointerDown = (e: React.PointerEvent) => {
      if (disabled) return
      setIsDragging(true)
      updateValueFromPointer(e.clientX)
      if (e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging || disabled) return
      updateValueFromPointer(e.clientX)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
      if (disabled) return
      setIsDragging(false)
      if (e.currentTarget.releasePointerCapture) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    }

    const updateValueFromPointer = (clientX: number) => {
      if (!trackRef.current || !onChange) return
      const rect = trackRef.current.getBoundingClientRect()
      if (rect.width <= 0) {
        onChange(min)
        return
      }
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const percent = x / rect.width
      const newValue = min + percent * (max - min)
      onChange(Number.isNaN(newValue) ? min : newValue)
    }

    const active = isHovered || isDragging

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-4 w-full cursor-pointer items-center group select-none touch-none',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Track */}
        <div
          ref={trackRef}
          className={cn(
            'relative h-1 w-full rounded-full overflow-hidden',
            'bg-neutral-800 border border-neutral-700/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]'
          )}
        >
          {/* Fill */}
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full',
              'bg-neutral-400 transition-colors duration-200',
              active && 'bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Thumb */}
        <motion.div
          animate={{
            scale: active ? 1 : 0.6,
            opacity: active ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'absolute top-1/2 -mt-[6px] -ml-[6px] h-3 w-3 rounded-full',
            'bg-white border border-neutral-200 shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
          )}
          style={{ left: `${percentage}%` }}
        />
      </div>
    )
  }
)

Slider.displayName = 'Slider'
