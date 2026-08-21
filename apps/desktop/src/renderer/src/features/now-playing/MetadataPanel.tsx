import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { HiFiVisualizer } from '@renderer/components/ui/HiFiVisualizer'

/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface MetadataPanelProps {
  className?: string
}

interface MiniTrackScrubberProps {
  duration: number
}

const MiniTrackScrubber = memo(({ duration }: MiniTrackScrubberProps) => {
  const progress = usePlayerStore((s) => s.progress)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const elapsed = duration > 0 ? Math.min(progress, duration) : progress
  const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0

  return (
    <div className="mt-2.5 flex items-center justify-between w-full select-none">
      <span className="font-mono text-[9.5px] tabular-nums font-medium transition-colors text-[var(--muted)]">
        {formatTime(elapsed)}
      </span>

      <div
        className="relative flex-1 mx-2.5 h-4 flex items-center cursor-pointer group"
        onClick={(e) => {
          if (duration <= 0) return
          const rect = e.currentTarget.getBoundingClientRect()
          const clickX = e.clientX - rect.left
          const ratio = Math.max(0, Math.min(1, clickX / rect.width))
          setProgress(Math.round(ratio * duration))
        }}
      >
        <div className="w-full h-[2.5px] rounded-full relative transition-colors bg-[var(--on-surface)]/20">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="font-mono text-[9.5px] tabular-nums font-medium transition-colors text-[var(--muted)] opacity-60">
        {formatTime(duration)}
      </span>
    </div>
  )
})
MiniTrackScrubber.displayName = 'MiniTrackScrubber'

export const MetadataPanel = memo(({ className }: MetadataPanelProps) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const hasTrack = currentTrack !== null
  const artworkUrl = currentTrack?.artworkUrl ?? albumPlaceholder
  const title = currentTrack?.title ?? '—'
  const artist = currentTrack?.artist ?? '—'
  const album = currentTrack?.album ?? '—'
  const duration = currentTrack?.duration ?? 0

  const theme = usePlayerStore((s) => s.theme)

  return (
    <section
      className={cn(
        'flex w-full flex-col items-start justify-between select-none overflow-y-auto no-scrollbar',
        'px-4 py-4 min-[800px]:px-6 min-[800px]:py-6 min-[1200px]:pl-10 min-[1200px]:pr-6',
        className
      )}
    >
      {/* ── Top Section: Header & Track Typography Stack ── */}
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-[9.5px] min-[800px]:text-[10px] uppercase tracking-[0.22em] transition-colors text-[var(--accent)]',
            )}
          >
            {hasTrack ? 'NOW PLAYING' : 'WAITING FOR MUSIC'}
          </span>
          {hasTrack && (
            <HiFiVisualizer
              isPlaying={isPlaying}
              barsCount={5}
              height={10}
              showPeaks={false}
            />
          )}
        </div>

        <div className="w-full relative min-h-[5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={hasTrack ? currentTrack?.audioUrl || title : 'empty'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {hasTrack ? (
                <>
                  <h1
                    className={cn(
                      'mt-1 min-[800px]:mt-2 font-serif text-[clamp(1.5rem,2.4vw,2.8rem)] font-medium leading-[0.95] tracking-[-0.025em] line-clamp-2 transition-colors text-[var(--on-surface)]',
                    )}
                    style={{ textShadow: 'var(--typography-glow)' }}
                    title={title}
                  >
                    {title}
                  </h1>
                  <p
                    className={cn(
                      'mt-1.5 min-[800px]:mt-2.5 text-[0.88rem] min-[800px]:text-[0.96rem] font-normal line-clamp-1 transition-colors text-[var(--muted)]',
                    )}
                  >
                    {artist}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-[0.78rem] min-[800px]:text-[0.82rem] font-normal line-clamp-1 transition-colors text-[var(--muted)] opacity-80',
                    )}
                  >
                    {album}
                  </p>
                </>
              ) : (
                <div className="mt-1 min-[800px]:mt-2">
                  <h1
                    className={cn(
                      'font-serif tracking-tight text-3xl min-[900px]:text-4xl min-[1200px]:text-[3.25rem] font-medium leading-[1.05] line-clamp-1 mb-1 transition-colors text-[var(--on-surface)]'
                    )}
                  >
                    Kissa
                  </h1>
                  <p
                    className={cn(
                      'text-[15px] min-[900px]:text-[17px] min-[1200px]:text-lg line-clamp-1 transition-colors text-[var(--muted)]'
                    )}
                  >
                    Drop a track, open your library, or start playing external media to begin listening.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative mt-24 min-[800px]:mt-28 min-[1200px]:mt-32 w-full max-w-[min(220px,78%)] min-[1200px]:max-w-[260px] transform-gpu">
          <div className="pointer-events-none absolute inset-3 translate-y-4 rounded-[1.2rem] bg-[var(--accent)]/20 blur-2xl" />
          <div className="relative aspect-square w-full overflow-hidden rounded-[1rem] border border-white/[0.1] bg-[var(--panel-bg)] shadow-[0_16px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] transform-gpu">
            <AnimatePresence mode="wait">
              <motion.img
                key={artworkUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                src={artworkUrl}
                alt={hasTrack ? `${title} — ${artist}` : 'Album artwork'}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = albumPlaceholder
                }}
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
          </div>

          {/* Mini Track Progress Bar */}
          <MiniTrackScrubber duration={duration} />

          {/* Editorial Developer Mark */}
          <div className="mt-3.5 flex items-center gap-2 select-none">
            <span
              className={cn(
                'font-mono uppercase text-[9px] min-[900px]:text-[10px] tracking-[0.2em] font-semibold text-[var(--on-surface)] opacity-40 mix-blend-overlay'
              )}
            >
              Crafted by{' '}
              <a
                href="https://github.com/NamanOG"
                onClick={(e) => {
                  e.preventDefault()
                  if (window.electron?.openExternal) {
                    window.electron.openExternal('https://github.com/NamanOG')
                  } else {
                    window.open('https://github.com/NamanOG', '_blank', 'noopener,noreferrer')
                  }
                }}
                className="font-medium transition-all hover:underline underline-offset-2 cursor-pointer text-[var(--on-surface)] hover:text-[var(--accent)]"
              >
                Naman
              </a>
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-tighter select-none text-[var(--accent)] opacity-80"
            >
              &lt; &gt;
            </span>
            <a
              href="https://github.com/NamanOG"
              onClick={(e) => {
                e.preventDefault()
                if (window.electron?.openExternal) {
                  window.electron.openExternal('https://github.com/NamanOG')
                } else {
                  window.open('https://github.com/NamanOG', '_blank', 'noopener,noreferrer')
                }
              }}
              className="group/gh flex items-center justify-center w-5 h-5 rounded-full border transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95 border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--on-surface)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              title="View Naman on GitHub (@NamanOG)"
              aria-label="GitHub Profile"
            >
              <svg className="w-3 h-3 fill-current transition-transform group-hover/gh:scale-105" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
})

MetadataPanel.displayName = 'MetadataPanel'
