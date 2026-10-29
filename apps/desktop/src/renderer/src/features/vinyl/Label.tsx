import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { usePlayerStore } from '@renderer/stores/playerStore'
import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'
import kissaIdleLabel from '@renderer/media/kissa_idle_label.jpg'
import { tl } from '@renderer/i18n'

interface LabelProps extends VinylLayerProps {
  albumArt?: string
}

/**
 * Vinyl record center label with album artwork and printed typography.
 * Accurately replicates the physical pressed center label in the reference image.
 */
export const Label = memo(({ className, style, size = '28%', albumArt, ...props }: LabelProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const title = currentTrack?.title ?? 'Kissa'
  const artist = currentTrack?.artist ?? 'Listening Machine'
  // The idle cover is a whole sleeve (record drawn above the name), so its record sits above the
  // middle. On the label, use a square cut centred on that record so it lines up with the spindle.
  const labelArt = albumArt === kissaIdleCover ? kissaIdleLabel : albumArt

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
        ...style
      }}
      {...props}
    >
      <AnimatePresence>
        {albumArt ? (
          <motion.img
            // Keyed by the picture too, so a sharper cover arriving later crossfades in.
            key={
              currentTrack
                ? `${title}|${artist}|${albumArt.length}:${albumArt.slice(-24)}`
                : 'empty-label'
            }
            // Follows the sleeve: a beat after the title, and the old label stays until covered.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.35 } }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            src={labelArt}
            alt={tl('a11y.albumArt')}
            className="absolute inset-0 w-full h-full object-cover object-center"
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
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
    </div>
  )
})

Label.displayName = 'Label'
