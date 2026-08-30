import { memo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

export interface FullscreenMetadataProps {
  className?: string
  isCentered?: boolean
}

export const FullscreenMetadata = memo(({ className, isCentered = false }: FullscreenMetadataProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const prefersReducedMotion = useReducedMotion()

  const title = currentTrack?.title ?? 'Waiting for music'
  const artist = currentTrack?.artist ?? 'Kissa'
  const album = currentTrack?.album
  const metadataKey = currentTrack?.audioUrl ?? currentTrack?.artworkUrl ?? `${title}-${artist}-${album ?? ''}`

  return (
    <section aria-label="Now playing" className={cn('w-full', className)}>
      <AnimatePresence mode="wait" initial={!prefersReducedMotion}>
        <motion.div
          key={metadataKey}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.4,
            ease: [0.22, 1, 0.36, 1]
          }}
          className={cn(
            "mx-auto flex flex-col items-center text-center"
          )}
        >
          {currentTrack?.artworkUrl && (
            <div className="mb-6 relative aspect-square w-[clamp(18rem,42vh,28rem)] min-[1400px]:w-[clamp(22rem,48vh,34rem)] overflow-hidden rounded-xl shadow-[0_24px_56px_rgba(0,0,0,0.75),0_6px_16px_rgba(0,0,0,0.5)] border border-white/10 bg-black/40 group">
              <img
                src={currentTrack.artworkUrl}
                alt={title}
                className="h-full w-full object-cover select-none"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />
            </div>
          )}
          <h1
            className="max-w-full font-serif text-[clamp(1.75rem,2.75vw,3rem)] font-medium leading-[1.15] pb-1 tracking-[-0.025em] text-[var(--on-surface)] line-clamp-2 drop-shadow-md"
            title={title}
          >
            {title}
          </h1>
          <p className="mt-2 max-w-full font-kissa-chassis uppercase text-[clamp(0.85rem,1.1vw,1rem)] tracking-[0.15em] text-[var(--muted)] line-clamp-1">
            {artist}
          </p>
          {album && (
            <p className="mt-1 max-w-full text-xs text-[var(--muted)]/60 font-sans tracking-wide line-clamp-1">
              {album}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
})

FullscreenMetadata.displayName = 'FullscreenMetadata'
