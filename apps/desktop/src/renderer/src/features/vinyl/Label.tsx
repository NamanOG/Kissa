import React, { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { usePlayerStore } from '@renderer/stores/playerStore'

interface LabelProps extends VinylLayerProps {
  albumArt?: string
}

/**
 * Vinyl record center label with album artwork and printed typography.
 * Accurately replicates the physical pressed center label in the reference image.
 */
export const Label = memo(({ className, style, size = '28%', albumArt, ...props }: LabelProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const title = currentTrack?.title ?? 'Self Control'
  const artist = currentTrack?.artist ?? 'Frank Ocean'

  return (
    <div
      className={cn(
        'absolute rounded-full overflow-hidden select-none',
        className
      )}
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: [
          'inset 0 0 0 1px rgba(255,255,255,0.12)',
          'inset 0 2px 4px rgba(0,0,0,0.6)',
          '0 0 0 1.5px rgba(0,0,0,0.6)',
          '0 0 0 2.5px rgba(255,255,255,0.04)',
          '0 2px 6px rgba(0,0,0,0.85)'
        ].join(', '),
        ...style
      }}
      {...props}
    >
      {/* Album artwork image background */}
      {albumArt ? (
        <img
          src={albumArt}
          alt="Album Art"
          className="w-full h-full object-cover object-center brightness-[0.9] contrast-[1.05]"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-[#1c1c1e]" />
      )}

      {/* Subtle paper texture overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-white/[0.08] mix-blend-overlay" />

      {/* Printed text overlay on label (Self Control / Frank Ocean) */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start pt-[14%] text-center px-1">
        <span className="font-sans text-[6px] min-[900px]:text-[7px] font-bold tracking-[0.14em] text-white/95 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none line-clamp-1">
          {title}
        </span>
        <span className="font-sans text-[4.5px] min-[900px]:text-[5px] font-medium tracking-[0.08em] text-white/70 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-[2px] line-clamp-1">
          {artist}
        </span>
      </div>

      {/* Center spindle cutout ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/80 bg-neutral-900/60 pointer-events-none"
        style={{ width: '16%', height: '16%' }}
      />

      {/* Physical pressed-edge ring groove */}
      <div className="absolute inset-0 rounded-full border border-white/15 pointer-events-none" />
    </div>
  )
})

Label.displayName = 'Label'
