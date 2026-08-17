import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export const TurntableShadow = memo(
  ({ className }: { className?: string }): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none -z-10', className)}
      >
        {/* Soft widespread ambient floor glow/shadow */}
        <div
          className="absolute"
          style={{
            left: '2%',
            right: '2%',
            top: '8%',
            bottom: '-12%',
            background:
              'radial-gradient(ellipse 95% 85% at 50% 55%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.15) 70%, transparent 90%)',
            filter: 'blur(32px)'
          }}
        />

        {/* Dense directional contact shadow right below front edge */}
        <div
          className="absolute"
          style={{
            left: '4%',
            right: '4%',
            bottom: '-6%',
            height: '24%',
            background:
              'radial-gradient(ellipse 90% 60% at 50% 30%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 80%)',
            filter: 'blur(14px)'
          }}
        />

        {/* Sharp foot contact shadows */}
        <div
          className="absolute w-24 h-6 rounded-full bg-black/90 blur-[6px]"
          style={{ left: '8%', bottom: '-4%' }}
        />
        <div
          className="absolute w-24 h-6 rounded-full bg-black/90 blur-[6px]"
          style={{ right: '8%', bottom: '-4%' }}
        />
      </div>
    )
  }
)

TurntableShadow.displayName = 'TurntableShadow'