import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

/**
 * The deck's shadow on the room: one soft, wide shade under the plinth. Static (the blur is
 * painted once). The tight contact line under the feet is drawn with the plinth.
 */
export const TurntableShadow = memo(
  ({ className }: { className?: string }): React.JSX.Element => {
    return (
      <div className={cn('absolute inset-0 pointer-events-none -z-10', className)}>
        <div
          className="absolute"
          style={{
            left: '5%',
            right: '5%',
            top: '74%',
            bottom: '-8%',
            background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 55%, transparent 80%)',
            filter: 'blur(18px)'
          }}
        />
      </div>
    )
  }
)

TurntableShadow.displayName = 'TurntableShadow'
