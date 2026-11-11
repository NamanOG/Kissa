import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'

export const GrooveLayer = memo(
  ({ className, style, size = '100%', ...props }: VinylLayerProps): React.JSX.Element => {
    return (
      <div
        className={cn('absolute inset-0 pointer-events-none', className)}
        style={{
          width: size,
          height: size,
          ...style
        }}
        {...props}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, rgba(255,255,255,0.03) 0.5px, transparent 1px, rgba(255,255,255,0.02) 1.5px, transparent 2px)',
            maskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 94%, transparent 95%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 94%, transparent 95%)'
          }}
        />

        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 3px, rgba(255,255,255,0.03) 4px, transparent 5px)',
            maskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 20%, transparent 21%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 14%, black 14.5%, black 20%, transparent 21%)'
          }}
        />

        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.04) 3px, transparent 4px)',
            maskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)',
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 94%, black 95%, black 98%, transparent 99%)'
          }}
        />

        {/* Track gaps: the smooth bands between songs, a touch darker than the grooves with a
            fine lit edge. Rings look the same at
            every angle, so turning costs nothing extra. */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" data-track-gaps="">
          {[21.5, 27, 32.8, 38.2, 43.4].map((r) => (
            <g key={r}>
              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.38)" strokeWidth="0.32" />
              <circle cx="50" cy="50" r={r + 0.24} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.12" />
            </g>
          ))}
          {/* Lead-in at the rim, run-out by the label. */}
          <circle cx="50" cy="50" r="47.6" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="16.2" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
        </svg>
      </div>
    )
  }
)

GrooveLayer.displayName = 'GrooveLayer'
