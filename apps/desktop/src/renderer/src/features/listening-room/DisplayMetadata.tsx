import { memo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export interface DisplayMetadataProps {
  className?: string
  align?: 'left' | 'center'
}

export const DisplayMetadata = memo(({ className, align = 'left' }: DisplayMetadataProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const prefersReducedMotion = useReducedMotion()

  const title = currentTrack?.title ?? 'Waiting for music'
  const artist = currentTrack?.artist ?? 'Kissa'
  const album = currentTrack?.album
  const metadataKey = currentTrack?.audioUrl ?? currentTrack?.artworkUrl ?? `${title}-${artist}-${album ?? ''}`
  const isCenter = align === 'center'

  return (
    <section
      aria-label="Now playing"
      className={cn(
        'flex flex-col',
        isCenter ? 'items-center text-center' : 'items-start text-left',
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={!prefersReducedMotion}>
        <motion.div
          key={metadataKey}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={{
            duration: prefersReducedMotion ? 0.3 : 0.8,
            ease: [0.22, 1, 0.36, 1]
          }}
          className={cn(
            'flex flex-col w-full',
            isCenter ? 'items-center text-center' : 'items-start text-left'
          )}
        >
          <h1
            className={cn(
              'max-w-full font-serif text-[clamp(2rem,3.5vw,4.5rem)] font-medium leading-[1.1] pb-2 tracking-[-0.02em] text-[var(--on-surface)] line-clamp-2 drop-shadow-lg',
              isCenter ? 'text-center' : 'text-left'
            )}
            title={title}
          >
            {title}
          </h1>
          <div
            className={cn(
              'flex flex-col gap-1 mt-1 w-full',
              isCenter ? 'items-center text-center' : 'items-start text-left'
            )}
          >
            <p className="max-w-full font-kissa-chassis uppercase text-[clamp(1rem,1.2vw,1.25rem)] tracking-[0.2em] text-[var(--accent)] line-clamp-1 opacity-90 font-bold">
              {artist}
            </p>
            {album && (
              <p className="max-w-full text-[clamp(0.9rem,1vw,1.1rem)] text-[var(--muted)] font-sans tracking-wide line-clamp-1 opacity-80">
                {album}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
})

DisplayMetadata.displayName = 'DisplayMetadata'
