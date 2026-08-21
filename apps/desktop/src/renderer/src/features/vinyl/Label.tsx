import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.7)',
        ...style
      }}
      {...props}
    >
      {/* Album artwork image background */}
      <AnimatePresence mode="wait">
        {albumArt ? (
          <motion.img
            key={albumArt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            src={albumArt}
            alt="Album Art"
            className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.95] contrast-[1.02]"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <motion.div
            key="empty-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full bg-[#1c1c1e] flex flex-col items-center justify-start pt-[14%] text-center px-1"
          >
            <span className="font-sans text-[6px] min-[900px]:text-[7px] font-bold tracking-[0.14em] text-white/95 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none line-clamp-1">
              {title}
            </span>
            <span className="font-sans text-[4.5px] min-[900px]:text-[5px] font-medium tracking-[0.08em] text-white/70 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-[2px] line-clamp-1">
              {artist}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle realistic paper texture overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/[0.05] mix-blend-overlay" />
    </div>
  )
})

Label.displayName = 'Label'
