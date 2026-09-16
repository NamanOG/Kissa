import { memo } from 'react'
import { SkipBack, SkipForward, Play, Pause, Minimize2, Quote, Aperture, Disc } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { RoomDimmer } from '../controls/RoomDimmer'
import { cn } from '@renderer/utils/cn'

export interface FullscreenControlsProps {
  isVisible: boolean
  showLyrics?: boolean
  onToggleLyrics?: () => void
  canShowLyrics?: boolean
}

export const FullscreenControls = memo(({ 
  isVisible, 
  showLyrics = false, 
  onToggleLyrics, 
  canShowLyrics = true 
}: FullscreenControlsProps) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const playPrev = usePlayerStore((s) => s.playPrev)
  const playNext = usePlayerStore((s) => s.playNext)
  const setFullscreen = usePlayerStore((s) => s.setFullscreen)
  const setIsListeningDisplay = usePlayerStore((s) => s.setIsListeningDisplay)
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const isAdaptive = theme === 'adaptive'

  const handlePlayPause = () => {
    togglePlayPause()
    if (currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
      window.__kissaMediaCommandCooldown?.()
      window.electron.mediaPlayPause()
    }
  }

  const handlePrev = () => {
    if (currentTrack?.sourceAppId && window.electron?.mediaPrev) {
      window.electron.mediaPrev()
    } else {
      playPrev()
    }
  }

  const handleNext = () => {
    if (currentTrack?.sourceAppId && window.electron?.mediaNext) {
      window.electron.mediaNext()
    } else {
      playNext()
    }
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col justify-between p-6 min-[900px]:p-12",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{
        transitionProperty: 'opacity',
        transitionDuration: 'var(--duration-ui, 280ms)',
        transitionTimingFunction: 'var(--ease-out, cubic-bezier(0.22,1,0.36,1))'
      }}
    >
      {/* Top Right: Exit Fullscreen & Enter Display */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          aria-label="Enter Listening Display"
          onClick={() => setIsListeningDisplay(true)}
          className="h-10 px-4 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-[transform,color,background-color] duration-150 text-[13px] font-medium tracking-wide uppercase font-sans"
        >
          <Disc className="w-4 h-4 mr-2" />
          Display
        </button>
        <button
          type="button"
          aria-label="Exit Fullscreen"
          onClick={() => setFullscreen(false)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-[transform,color,background-color] duration-150"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls */}
      <div 
        className={cn(
          "absolute bottom-6 min-[900px]:bottom-10 transition-all flex justify-center",
          showLyrics ? "left-1/4 -translate-x-1/2" : "left-1/2 -translate-x-1/2"
        )}
        style={{
          transitionDuration: '600ms',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Unified Glass Dock */}
        <div className="flex items-center gap-4 min-[900px]:gap-6 bg-black/40 backdrop-blur-3xl px-6 min-[900px]:px-8 py-3.5 min-[900px]:py-4 rounded-full border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.6)] transform-gpu">
          
          {/* Left Accessory (Fixed width for symmetry) */}
          <div className="flex items-center justify-start w-[140px] min-[1100px]:w-[180px] gap-3">
            {canShowLyrics && onToggleLyrics && (
              <button
                type="button"
                aria-label={showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                onClick={onToggleLyrics}
                className={cn(
                  "w-10 h-10 min-[900px]:w-11 min-[900px]:h-11 shrink-0 flex items-center justify-center rounded-full transition-[color,background-color,transform] duration-150 active:scale-[0.97]",
                  showLyrics 
                    ? "bg-white text-black shadow-lg" 
                    : "bg-transparent text-white/50 hover:text-white hover:bg-white/10"
                )}
                title="Toggle Lyrics"
              >
                <Quote className="w-[18px] h-[18px] min-[900px]:w-5 min-[900px]:h-5" fill={showLyrics ? "currentColor" : "none"} />
              </button>
            )}

            <button
              type="button"
              aria-label={isAdaptive ? "Disable Match Album" : "Enable Match Album"}
              onClick={() => setTheme(isAdaptive ? 'quiet-room' : 'adaptive')}
              className={cn(
                "w-10 h-10 min-[900px]:w-11 min-[900px]:h-11 shrink-0 flex items-center justify-center rounded-full transition-[color,background-color,transform] duration-150 active:scale-[0.97]",
                isAdaptive 
                  ? "bg-[#e8a95d]/20 text-[#e8a95d]" 
                  : "bg-transparent text-white/50 hover:text-white hover:bg-white/10"
              )}
              title="Match Album Art Color"
            >
              <Aperture className="w-[18px] h-[18px] min-[900px]:w-5 min-[900px]:h-5" />
            </button>
          </div>

          {/* Transport Controls (Center) */}
          <div className="flex items-center gap-4 min-[900px]:gap-5 shrink-0">
            <button
              type="button"
              aria-label="Skip Back"
              onClick={handlePrev}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white active:scale-[0.95] transition-[transform,color] duration-150 cursor-pointer"
            >
              <SkipBack className="w-5 h-5 min-[900px]:w-6 min-[900px]:h-6" fill="currentColor" />
            </button>
            
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={handlePlayPause}
              className="w-12 h-12 min-[900px]:w-14 min-[900px]:h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-[0.95] transition-[transform,background-color] duration-150 cursor-pointer"
            >
              <div
                key={isPlaying ? 'pause' : 'play'}
                className="flex items-center justify-center transition-transform duration-100 ease-out"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 min-[900px]:w-6 min-[900px]:h-6" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 min-[900px]:w-6 min-[900px]:h-6 ml-0.5" fill="currentColor" />
                )}
              </div>
            </button>
            
            <button
              type="button"
              aria-label="Skip Forward"
              onClick={handleNext}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white active:scale-[0.95] transition-[transform,color] duration-150 cursor-pointer"
            >
              <SkipForward className="w-5 h-5 min-[900px]:w-6 min-[900px]:h-6" fill="currentColor" />
            </button>
          </div>

          {/* Right Accessory (Fixed width for symmetry) */}
          <div className="flex items-center justify-end w-[140px] min-[1100px]:w-[180px] gap-3">
            <div className="h-8 w-[1px] bg-white/10 mr-1 shrink-0" />
            <div className="flex-1 max-w-[140px]">
              <RoomDimmer />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

FullscreenControls.displayName = 'FullscreenControls'
