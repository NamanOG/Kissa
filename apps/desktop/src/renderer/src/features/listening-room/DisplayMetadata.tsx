import { memo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'
import { tl } from '@renderer/i18n'

export interface DisplayMetadataProps {
  className?: string
  align?: 'left' | 'center'
}

export const DisplayMetadata = memo(({ className, align = 'left' }: DisplayMetadataProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const prefersReducedMotion = useReducedMotion()

  const isIdle = !currentTrack || currentTrack.sourceAppId === 'kissa-idle'
  const title = isIdle ? 'Nothing playing' : currentTrack.title
  const artist = isIdle ? 'Start a song in any app' : currentTrack.artist
  const album =
    !isIdle && currentTrack.album && currentTrack.album.toLowerCase() !== title.toLowerCase()
      ? currentTrack.album
      : undefined
  const metadataKey = currentTrack?.audioUrl ?? currentTrack?.artworkUrl ?? `${title}-${artist}-${album ?? ''}`
  const isCenter = align === 'center'

  return (
    <section
      aria-label={tl('a11y.nowPlaying')}
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
              '-mt-[0.14em] pt-[0.14em] max-w-full font-serif text-[clamp(2rem,3.5vw,4.5rem)] font-medium leading-[1.1] mb-2 tracking-[-0.02em] text-ink line-clamp-2 drop-shadow-lg',
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
            <p className="max-w-full font-sans text-[clamp(1.05rem,1.3vw,1.35rem)] font-medium tracking-[-0.005em] text-white/85 line-clamp-1">
              {artist}
            </p>
            {album && (
              <p className="max-w-full text-[clamp(0.9rem,1vw,1.1rem)] text-dim font-sans tracking-wide line-clamp-1 opacity-80">
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
