import { memo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlbumSleeve } from '@renderer/features/now-playing'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export interface FullscreenArtworkProps {
  className?: string
}

export const FullscreenArtwork = memo(({ className }: FullscreenArtworkProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const illuminationLevel = usePlayerStore((s) => s.illuminationLevel)
  const prefersReducedMotion = useReducedMotion()

  const artworkKey = currentTrack?.artworkUrl ?? 'kissa-placeholder-artwork'
  const title = currentTrack?.title ?? 'Kissa'
  // Background illumination is behind this foreground sleeve, so this floor keeps
  // the physical artwork legible without double-dimming it.
  const brightness = 0.35 + 0.65 * Math.max(0, Math.min(100, illuminationLevel)) / 100

  return (
    <section
      aria-label="Album artwork"
      className={cn('flex w-full items-center justify-center', className)}
    >
      <div className="w-[clamp(240px,45vh,600px)] max-w-[calc(100vw-3rem)] transform-gpu">
        <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
          <motion.div
            key={artworkKey}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            <AlbumSleeve artworkUrl={currentTrack?.artworkUrl} title={title} flat />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
})

FullscreenArtwork.displayName = 'FullscreenArtwork'
