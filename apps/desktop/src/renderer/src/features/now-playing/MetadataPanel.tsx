import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { HiFiVisualizer } from '@renderer/components/ui/HiFiVisualizer'
import { ShareTrackModal } from '@renderer/features/share/ShareTrackModal'
import { greetingFor } from '@renderer/utils/greeting'

/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface MetadataPanelProps {
  className?: string
}

/**
 * The sleeve notes beside the deck: what is playing, who by, and its cover.
 * Time and transport live in the dock, so nothing here repeats them.
 */
export const MetadataPanel = memo(({ className }: MetadataPanelProps) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const [isShareOpen, setIsShareOpen] = useState(false)

  const isIdle = !currentTrack || currentTrack.sourceAppId === 'kissa-idle'
  const artworkUrl = currentTrack?.artworkUrl ?? albumPlaceholder
  const title = currentTrack?.title?.trim() || '—'
  const artist = currentTrack?.artist?.trim() || '—'
  const album = currentTrack?.album?.trim() || ''
  const duration = currentTrack?.duration ?? 0
  const showAlbum = !isIdle && album && album.toLowerCase() !== title.toLowerCase()

  return (
    <section
      className={cn(
        'flex w-full flex-col items-start select-none',
        'px-4 pt-4 pb-14 min-[800px]:px-6 min-[800px]:pt-6 min-[1200px]:pl-10 min-[1200px]:pr-6',
        className
      )}
    >
      <div
        className="flex w-full flex-col items-start transition-opacity duration-75"
        style={{ opacity: 'calc(0.4 + 0.6 * var(--room-illumination, 1))' }}
      >
        <div className="flex h-4 items-center gap-2">
          <span className="font-kissa-chassis text-[10px] font-semibold uppercase tracking-[0.22em] text-tone">
            {isIdle ? 'The room is quiet' : isPlaying ? 'Now playing' : 'Paused'}
          </span>
          {!isIdle && <HiFiVisualizer isPlaying={isPlaying} barsCount={5} height={10} showPeaks={false} />}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isIdle ? 'idle' : `${title}|${artist}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {isIdle ? (
              <>
                <h1 className="mt-2 font-kissa-editorial text-[clamp(1.5rem,2.4vw,2.8rem)] font-medium leading-[1.1] tracking-[-0.025em] text-ink text-balance">
                  {greetingFor(new Date(), listenerName)}
                </h1>
                <p className="mt-3 max-w-[30ch] text-[13px] leading-relaxed text-dim">
                  Play something in Spotify, Apple Music or your browser. It lands on the platter.
                </p>
              </>
            ) : (
              <>
                <h1
                  className="mt-2 pb-1 font-kissa-editorial text-[clamp(1.5rem,2.4vw,2.8rem)] font-medium leading-[1.1] tracking-[-0.025em] text-ink line-clamp-2 text-balance"
                  style={{ textShadow: 'var(--typography-glow)' }}
                  title={title}
                >
                  {title}
                </h1>
                <p className="mt-2 font-kissa-editorial text-[1.1rem] font-medium text-ink/80 line-clamp-1" title={artist}>
                  {artist}
                </p>
                {showAlbum && (
                  <p className="mt-0.5 font-kissa-editorial text-[0.95rem] italic text-dim line-clamp-1" title={album}>
                    {album}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2.5 font-mono text-[10px] tracking-wide text-dim">
                  {duration > 0 && <span className="tabular-nums">{formatTime(duration)}</span>}
                  {duration > 0 && currentTrack?.source && <span aria-hidden="true" className="opacity-50">·</span>}
                  {currentTrack?.source && <span>from {currentTrack.source}</span>}
                  <button
                    type="button"
                    onClick={() => setIsShareOpen(true)}
                    className="ml-1 rounded p-1 text-dim transition-colors hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone active:scale-95"
                    title="Share this track"
                    aria-label="Share this track"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="relative mt-9 w-full max-w-[min(220px,78%)] min-[900px]:mt-12 min-[1200px]:max-w-[260px]">
          <div className="relative aspect-square w-full overflow-hidden rounded-[1rem] bg-[var(--panel-bg)] shadow-[0_14px_32px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10">
            <AnimatePresence initial={false}>
              <motion.img
                key={isIdle ? 'idle-cover' : `${title}|${artist}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                src={artworkUrl}
                alt={isIdle ? '' : `Cover of ${album || title} by ${artist}`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = albumPlaceholder
                }}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ShareTrackModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} track={currentTrack} />
    </section>
  )
})

MetadataPanel.displayName = 'MetadataPanel'
