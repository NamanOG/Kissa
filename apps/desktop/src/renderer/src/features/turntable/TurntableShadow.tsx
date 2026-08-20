import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export const TurntableShadow = memo(
  ({ className }: { className?: string }): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none -z-10', className)}
      >
        {/* Soft natural floor grounding shadow (directional downwards beneath bottom edge) */}
        <div
          className="absolute"
          style={{
            left: '6%',
            right: '6%',
            top: '70%',
            bottom: '-12%',
            background:
              'radial-gradient(ellipse 85% 70% at 50% 30%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 50%, transparent 85%)',
            filter: 'blur(20px)'
          }}
        />

        {/* Directional contact shadow directly beneath plinth front face */}
        <div
          className="absolute"
          style={{
            left: '8%',
            right: '8%',
            bottom: '-4%',
            height: '14%',
            background:
              'radial-gradient(ellipse 90% 50% at 50% 20%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 85%)',
            filter: 'blur(10px)'
          }}
        />

        {/* Sharp foot contact shadows */}
        <div
          className="absolute w-20 h-5 rounded-full bg-black/80 blur-[4px]"
          style={{ left: '9%', bottom: '-3%' }}
        />
        <div
          className="absolute w-20 h-5 rounded-full bg-black/80 blur-[4px]"
          style={{ right: '9%', bottom: '-3%' }}
        />
      </div>
    )
  }
)

TurntableShadow.displayName = 'TurntableShadow'