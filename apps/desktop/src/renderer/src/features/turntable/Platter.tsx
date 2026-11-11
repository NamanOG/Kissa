import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'

export interface PlatterProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: string
}

/**
 * The platter: dark satin aluminium, only a few pixels wider than the record, so it reads as a
 * quiet lip round it and the record stays the subject. One soft sheen from the room's light and a
 * single fine highlight on its edge. Static: the light does not turn with the platter, so
 * nothing here repaints.
 */
export const Platter = memo(({ className, style, size = '101.8%', ...props }: PlatterProps): React.JSX.Element => {
  return (
    <div
      className={cn('absolute rounded-full select-none pointer-events-none', className)}
      style={{ width: size, height: size, ...style }}
      data-platter=""
      {...props}
    >
      {/* The platter's side, seen below its top face, and its soft shadow in the recess. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          transform: 'translateY(0.7%)',
          background: 'linear-gradient(90deg, #17181a 0%, #36383c 45%, #2a2b2e 70%, #121315 100%)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.45)'
        }}
      />
      {/* The top face: smooth aluminium, lighter towards the lamp. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(150deg, #5e6065 0%, #46484c 40%, #333539 75%, #26272a 100%)'
        }}
      />
      {/* One soft, even sheen that follows the room light and takes a little of its colour. */}
      <div
        className="absolute inset-0 rounded-full"
        data-platter-light=""
        style={{
          background:
            'radial-gradient(120% 90% at 25% 10%, color-mix(in srgb, color-mix(in srgb, var(--accent, #d7a76c) 14%, #fff) 18%, transparent), transparent 60%)',
          opacity: 'calc(0.3 + 0.7 * var(--room-illumination, 1))'
        }}
      />
      {/* Fine turning marks on the visible lip: machined aluminium, at low contrast. Static. */}
      <div
        className="absolute inset-0 rounded-full"
        data-platter-turning=""
        style={{
          background:
            'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.07) 0 0.5px, rgba(0,0,0,0.06) 0.5px 1px, transparent 1px 1.6px)',
          maskImage: 'radial-gradient(circle, transparent 97.6%, #000 98%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 97.6%, #000 98%)'
        }}
      />
      {/* A single fine highlight on the lit edge, a crisp dark line on the far one. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 0.5px rgba(0,0,0,0.5)' }}
      />
    </div>
  )
})

Platter.displayName = 'Platter'
