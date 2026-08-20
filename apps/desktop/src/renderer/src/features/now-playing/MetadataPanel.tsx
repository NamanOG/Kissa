import { memo } from 'react'
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
  isLightTheme: boolean
}

const MiniTrackScrubber = memo(({ duration, isLightTheme }: MiniTrackScrubberProps) => {
  const progress = usePlayerStore((s) => s.progress)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const elapsed = duration > 0 ? Math.min(progress, duration) : progress
  const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0

  return (
    <div className="mt-2.5 flex items-center justify-between w-full select-none">
      <span
        className={cn(
          'font-mono text-[9.5px] tabular-nums font-medium transition-colors',
          isLightTheme ? 'text-[#6e6155]' : 'text-[#b7a99b]'
        )}
      >
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
        <div
          className={cn(
            'w-full h-[2.5px] rounded-full relative transition-colors',
            isLightTheme ? 'bg-black/15' : 'bg-white/10'
          )}
        >
          <div
            className="h-full bg-[#d7a76c] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span
        className={cn(
          'font-mono text-[9.5px] tabular-nums font-medium transition-colors',
          isLightTheme ? 'text-[#8a7c6f]' : 'text-[#887b70]'
        )}
      >
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
  const isLightTheme = theme === 'sunday-morning' || theme === 'concrete-vinyl'

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
              'font-mono text-[9.5px] min-[800px]:text-[10px] uppercase tracking-[0.22em] transition-colors',
              isLightTheme ? 'text-[#6e6155]' : 'text-[#b7a99b]'
            )}
          >
            {hasTrack ? 'NOW PLAYING' : 'WAITING FOR MUSIC'}
          </span>
          {hasTrack && (
            <HiFiVisualizer
              isPlaying={isPlaying}
              isLightTheme={isLightTheme}
              barsCount={5}
              height={10}
              showPeaks={false}
            />
          )}
        </div>

        <div className="w-full">
          <h1
            className={cn(
              'mt-1 min-[800px]:mt-2 font-serif text-[clamp(1.5rem,2.4vw,2.8rem)] font-medium leading-[0.95] tracking-[-0.025em] line-clamp-2 transition-colors',
              isLightTheme ? 'text-[#1c1814]' : 'text-[#f5efe6]'
            )}
            title={title}
          >
            {title}
          </h1>
          <p
            className={cn(
              'mt-1.5 min-[800px]:mt-2.5 text-[0.88rem] min-[800px]:text-[0.96rem] font-normal line-clamp-1 transition-colors',
              hasTrack
                ? isLightTheme
                  ? 'text-[#38312a]'
                  : 'text-[#d6c9bb]'
                : isLightTheme
                  ? 'text-[#8a7e72]'
                  : 'text-[#7d7168]'
            )}
          >
            {artist}
          </p>
          <p
            className={cn(
              'mt-0.5 text-[0.78rem] min-[800px]:text-[0.82rem] font-normal line-clamp-1 transition-colors',
              hasTrack
                ? isLightTheme
                  ? 'text-[#5e5348]'
                  : 'text-[#9d9187]'
                : isLightTheme
                  ? 'text-[#a3978b]'
                  : 'text-[#625952]'
            )}
          >
            {album}
          </p>
        </div>

        {/* Album Artwork */}
        <div className="relative mt-4 min-[800px]:mt-6 min-[1200px]:mt-8 w-full max-w-[min(220px,78%)] min-[1200px]:max-w-[260px]">
          <div className="pointer-events-none absolute inset-3 translate-y-4 rounded-[1.2rem] bg-[#a8613d]/20 blur-2xl" />
          <div className="relative aspect-square w-full overflow-hidden rounded-[1rem] border border-white/[0.1] bg-[#211a17] shadow-[0_16px_36px_rgba(16,10,8,0.46),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <img
              src={artworkUrl}
              alt={hasTrack ? `${title} — ${artist}` : 'Album artwork'}
              className="h-full w-full object-cover"
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = albumPlaceholder
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#150e0b]/35 via-transparent to-[#f5d5b4]/[0.07]" />
          </div>

          {/* Mini Track Progress Bar */}
          <MiniTrackScrubber duration={duration} isLightTheme={isLightTheme} />

          {/* Editorial Developer Mark */}
          <div className="mt-3.5 flex items-center gap-2 select-none">
            <span
              className={cn(
                'text-[12px] font-normal tracking-wide transition-colors',
                isLightTheme ? 'text-[#5e5348]' : 'text-[#b7a99b]'
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
                className={cn(
                  'font-medium transition-all hover:underline underline-offset-2 cursor-pointer',
                  isLightTheme ? 'text-[#1c1814] hover:text-[#b45309]' : 'text-[#f5efe6] hover:text-[#d7a76c]'
                )}
              >
                Naman
              </a>
            </span>
            <span
              className={cn(
                'font-mono text-[11px] font-medium tracking-tighter select-none',
                isLightTheme ? 'text-[#8a7c6f]' : 'text-[#d7a76c]/80'
              )}
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
              className={cn(
                'group/gh flex items-center justify-center w-5 h-5 rounded-full border transition-all cursor-pointer shadow-sm',
                'hover:scale-110 active:scale-95',
                isLightTheme
                  ? 'border-black/15 bg-black/[0.04] text-[#1c1814] hover:bg-black/10 hover:border-black/25'
                  : 'border-white/[0.14] bg-white/[0.08] text-[#f5efe6] hover:bg-[#d7a76c]/20 hover:border-[#d7a76c]/60 hover:text-[#dfb47e]'
              )}
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
