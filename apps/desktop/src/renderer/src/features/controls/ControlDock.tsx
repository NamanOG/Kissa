import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { SkipBack, SkipForward, Play, Pause, Volume2, Quote } from 'lucide-react'
import { SleepTimer } from './SleepTimer'

/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface ControlDockProps {
  className?: string
}

const Scrubber = memo(() => {
  const progress = usePlayerStore((s) => s.progress)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  
  const duration = currentTrack?.duration ?? 0
  const elapsed = duration > 0 ? Math.min(progress, duration) : progress
  const progressPercent = duration > 0 ? (elapsed / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2 min-[900px]:gap-3 flex-1 min-w-[50px] min-[800px]:min-w-[100px] min-[1100px]:min-w-[160px]">
      <span className="font-mono text-[10px] min-[900px]:text-[11px] tabular-nums text-neutral-400 font-medium shrink-0">
        {formatTime(elapsed)}
      </span>

      <div
        className="relative flex-1 h-5 flex items-center cursor-pointer group"
        onClick={(e) => {
          if (duration <= 0) return
          const rect = e.currentTarget.getBoundingClientRect()
          const clickX = e.clientX - rect.left
          const ratio = Math.max(0, Math.min(1, clickX / rect.width))
          setProgress(Math.round(ratio * duration))
        }}
      >
        <div className="w-full h-[3px] bg-[#5a4940]/70 rounded-full relative">
          <div
            className="h-full bg-[#d7a76c] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#e0bd8c] rounded-full shadow-[0_1px_4px_rgba(20,12,8,0.5)] -translate-x-1/2 transition-transform group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="font-mono text-[10px] min-[900px]:text-[11px] tabular-nums text-neutral-500 font-medium shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  )
})
Scrubber.displayName = 'Scrubber'

/**
 * Bottom Playback Control Dock.
 * Highly responsive floating audio dock that fits gracefully on all window sizes.
 */
export const ControlDock = memo(({ className }: ControlDockProps) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const activeView = usePlayerStore((s) => s.activeView)
  const setProgress = usePlayerStore((s) => s.setProgress)

  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)
  const setActiveView = usePlayerStore((s) => s.setActiveView)

  const hasTrack = currentTrack !== null
  const isLyricsActive = activeView === 'lyrics' || showSideLyrics

  return (
    <div
      className={cn(
        'relative z-30 mx-2 mb-2 min-[900px]:mx-3 min-[900px]:mb-3 flex h-[62px] min-[900px]:h-[70px] w-[calc(100%-1rem)] min-[900px]:w-[calc(100%-1.5rem)] shrink-0 items-center justify-between rounded-[1.2rem]',
        'border border-white/[0.09] bg-[#2a211d]/60 shadow-[0_18px_46px_rgba(14,9,7,0.26),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl',
        'px-3 min-[900px]:px-6 min-[1200px]:px-8 select-none',
        !hasTrack && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* ── Left: Volume Slider ─────────────────────────── */}
      <div className="flex items-center gap-2 min-[900px]:gap-3 w-[80px] min-[900px]:w-[120px] min-[1200px]:w-[150px] shrink-0">
        <Volume2 className="h-3.5 w-3.5 min-[900px]:h-4 min-[900px]:w-4 text-[#b7a99b] shrink-0" strokeWidth={1.75} />

        <div
          className="relative flex-1 h-6 flex items-center cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const ratio = Math.max(0, Math.min(1, clickX / rect.width))
            setVolume(Math.round(ratio * 100))
          }}
        >
          {/* Base rail */}
          <div className="w-full h-[3px] bg-[#5a4940]/70 rounded-full relative">
            {/* Amber fill */}
            <div
              className="h-full bg-[#d7a76c] rounded-full"
              style={{ width: `${volume}%` }}
            />
            {/* Round thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#f5efe6] rounded-full -translate-x-1/2 transition-transform group-hover:scale-125"
              style={{ left: `${volume}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Center: Transport Controls & Scrubber ─────────── */}
      <div className="flex items-center gap-2 min-[800px]:gap-4 min-[1100px]:gap-6 flex-1 max-w-[620px] justify-center mx-1.5 min-[900px]:mx-4 min-[1200px]:mx-6">
        {/* Skip Back Button */}
        <button
          type="button"
          onClick={() => {
            if (currentTrack?.sourceAppId && window.electron?.mediaPrev) {
              window.electron.mediaPrev()
            } else {
              setProgress(0)
            }
          }}
          aria-label="Previous track"
          className="text-[#b7a99b] hover:text-[#f5efe6] transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <SkipBack className="h-3.5 w-3.5 min-[900px]:h-4 min-[900px]:w-4 fill-current" />
        </button>

        {/* Play/Pause Button with Thin Golden Ring Outline */}
        <button
          type="button"
          onClick={() => {
            togglePlayPause()
            if (currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
              window.__kissaMediaCommandCooldown?.()
              window.electron.mediaPlayPause()
            }
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'relative h-8 w-8 min-[900px]:h-9 min-[900px]:w-9 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0',
            'border border-[#e0bd8c]/65 bg-[#3a2e27]/80 shadow-[0_4px_12px_rgba(14,9,7,0.34),inset_0_1px_0_rgba(255,255,255,0.13)] hover:border-[#f0d0a2] active:translate-y-px'
          )}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 min-[900px]:h-4 min-[900px]:w-4 text-[#f5efe6] fill-[#f5efe6]" />
          ) : (
            <Play className="h-3.5 w-3.5 min-[900px]:h-4 min-[900px]:w-4 text-[#f5efe6] fill-[#f5efe6] ml-0.5" />
          )}
        </button>

        {/* Skip Forward Button */}
        <button
          type="button"
          onClick={() => {
            if (currentTrack?.sourceAppId && window.electron?.mediaNext) {
              window.electron.mediaNext()
            }
          }}
          aria-label="Next track"
          className="text-[#b7a99b] hover:text-[#f5efe6] transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <SkipForward className="h-3.5 w-3.5 min-[900px]:h-4 min-[900px]:w-4 fill-current" />
        </button>

        {/* Scrubber Bar Area */}
        <Scrubber />
      </div>

      {/* ── Right: Lyrics Toggle, Source Pill & Equalizer ── */}
      <div className="flex items-center gap-1.5 min-[900px]:gap-2.5 shrink-0 justify-end">
        {/* Sleep Timer Popover */}
        <SleepTimer />

        {/* Apple Music Style Live Lyrics Toggle */}
        <button
          type="button"
          onClick={() => {
            if (activeView === 'lyrics') {
              setActiveView('deck')
            } else {
              toggleSideLyrics()
            }
          }}
          className={cn(
            'flex items-center gap-1 px-2 min-[900px]:px-3 py-1 rounded-full border transition-all cursor-pointer select-none active:scale-95',
            isLyricsActive
              ? 'border-[#d7a76c] bg-[#d7a76c]/15 text-[#f5efe6] shadow-[0_0_12px_rgba(215,167,108,0.3)]'
              : 'border-white/[0.08] bg-[#342923]/55 text-[#a99b90] hover:text-[#f5efe6] hover:border-white/[0.15]'
          )}
          title={isLyricsActive ? 'Hide Lyrics' : 'Show Synced Lyrics'}
          aria-label="Toggle Live Lyrics"
        >
          <Quote className={cn('w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5', isLyricsActive ? 'text-[#d7a76c]' : 'currentColor')} />
          <span className="hidden min-[760px]:inline font-mono text-[8.5px] min-[900px]:text-[9px] font-bold tracking-[0.14em] uppercase">
            Lyrics
          </span>
        </button>

        {/* Dynamic Source Pill */}
        <div className="flex items-center gap-1.5 px-2 min-[900px]:px-2.5 py-1 rounded-full border border-white/[0.08] bg-[#342923]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all">
          {currentTrack?.source?.toLowerCase().includes('apple') ? (
            <div className="w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5 rounded-full bg-[#fa243c] flex items-center justify-center shrink-0">
              <svg className="w-1.5 h-1.5 min-[900px]:w-2 min-[900px]:h-2 fill-white -translate-y-[0.5px]" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.63-13.98-5.99-9.35-10.6-19.78-13.82-31.31-3.23-11.53-4.84-22.39-4.84-32.58 0-14.58 3.63-26.68 10.9-36.28 7.27-9.61 16.5-14.54 27.69-14.81 4.9 0 10.45 1.25 16.65 3.76 6.21 2.51 10.14 3.84 11.8 4 1.77-.16 5.86-1.54 12.28-4.14 6.42-2.6 11.95-3.79 16.59-3.56 12.44.68 22.32 5.37 29.62 14.07-10.89 6.67-16.22 15.82-16 27.46.22 9.08 3.78 16.71 10.68 22.89 6.9 6.18 15.13 9.77 24.69 10.77-2.12 6.55-4.7 13.04-7.75 19.46zM119.22 33.79c-.06-5.8 2.05-11.45 6.32-16.94 4.27-5.49 9.61-9.37 16.03-11.65.65 5.56-1.42 11.23-6.2 17.02-4.78 5.79-10.15 9.65-16.15 11.57z" />
              </svg>
            </div>
          ) : (
            <div className="w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5 rounded-full bg-[#1db954] flex items-center justify-center shrink-0">
              <svg className="w-2 h-2 fill-black" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.675.467-1.028.252-2.817-1.722-6.362-2.111-10.539-1.157-.403.092-.807-.16-.899-.563-.092-.403.16-.807.563-.899 4.572-1.045 8.492-.595 11.651 1.339.353.215.467.675.252 1.028zm1.467-3.262c-.27.44-.848.58-1.288.31-3.225-1.982-8.14-2.557-11.954-1.399-.496.15-1.023-.133-1.173-.629-.15-.496.133-1.023.629-1.173 4.364-1.324 9.791-.682 13.476 1.583.44.27.58.848.31 1.288zm.126-3.41c-3.868-2.297-10.248-2.508-13.941-1.387-.593.18-1.223-.157-1.403-.75-.18-.593.157-1.223.75-1.403 4.244-1.289 11.282-1.041 15.733 1.601.533.316.708 1.011.392 1.544-.316.533-1.011.708-1.544.392z" />
              </svg>
            </div>
          )}
          <span className="font-mono text-[8.5px] min-[900px]:text-[9px] font-bold tracking-[0.14em] text-[#d6c9bb] uppercase truncate max-w-[55px] min-[900px]:max-w-none">
            {currentTrack?.source || 'SPOTIFY'}
          </span>
        </div>

        {/* Dynamic Equalizer Visualizer */}
        <div
          className="hidden min-[640px]:flex items-end gap-[2px] h-3.5 w-4.5 justify-center px-0.5 py-0.5 select-none"
          aria-hidden="true"
          title="Audio Output Engine Live"
        >
          <span
            className={cn(
              'w-[2px] rounded-full transition-all duration-300',
              isPlaying ? 'bg-[#d7a76c] animate-[pulse_0.8s_ease-in-out_infinite]' : 'bg-[#6b584d] h-1'
            )}
            style={{ height: isPlaying ? '80%' : '20%' }}
          />
          <span
            className={cn(
              'w-[2px] rounded-full transition-all duration-300',
              isPlaying ? 'bg-[#dfb47e] animate-[pulse_1.1s_ease-in-out_infinite_0.2s]' : 'bg-[#6b584d] h-2'
            )}
            style={{ height: isPlaying ? '100%' : '40%' }}
          />
          <span
            className={cn(
              'w-[2px] rounded-full transition-all duration-300',
              isPlaying ? 'bg-[#d7a76c] animate-[pulse_0.9s_ease-in-out_infinite_0.4s]' : 'bg-[#6b584d] h-1.5'
            )}
            style={{ height: isPlaying ? '60%' : '30%' }}
          />
        </div>
      </div>
    </div>
  )
})

ControlDock.displayName = 'ControlDock'
