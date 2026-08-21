import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { VinylEngine } from '@renderer/features/vinyl'
import { Play, Pause, SkipBack, SkipForward, Maximize2, ListMusic, X } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { QueueView } from '@renderer/features/queue'

export const MiniPlayerView = (): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const theme = usePlayerStore((s) => s.theme)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const playNext = usePlayerStore((s) => s.playNext)
  const playPrev = usePlayerStore((s) => s.playPrev)
  const toggleMiniPlayer = usePlayerStore((s) => s.toggleMiniPlayer)

  const duration = currentTrack?.duration ?? 0

  const [showQueue, setShowQueue] = useState(false)
  
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number
    
    const updateScrubber = () => {
      if (duration > 0 && fillRef.current) {
        const time = PlaybackClock.getCurrentTime()
        const elapsed = Math.max(0, Math.min(time, duration))
        const percent = elapsed / duration
        fillRef.current.style.transform = `scaleX(${percent})`
      } else if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(0)`
      }
      
      rafId = requestAnimationFrame(updateScrubber)
    }

    rafId = requestAnimationFrame(updateScrubber)
    return () => cancelAnimationFrame(rafId)
  }, [duration])

  return (
    <div className="relative flex flex-col w-full h-full p-4 overflow-hidden app-region-drag select-none transition-colors duration-500 bg-[var(--panel-bg)] text-[var(--on-surface)]">
      {/* ── Top Bar ── */}
      <div className="relative z-10 flex items-center justify-between mt-2 shrink-0 px-2 pointer-events-auto">
        <div className="flex-1 min-w-0 app-region-no-drag">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack?.audioUrl || 'empty'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col"
            >
              <h3 className="font-serif text-lg font-medium line-clamp-1 tracking-tight text-[var(--on-surface)]">
                {currentTrack?.title ?? 'Kissa'}
              </h3>
              <p className="text-xs line-clamp-1 text-[var(--muted)]">
                {currentTrack?.artist ?? 'Waiting for music'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <button
          type="button"
          onClick={() => toggleMiniPlayer()}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer app-region-no-drag text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--on-surface)]/[0.05]"
          title="Restore Window"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main Visual (Vinyl) ── */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center pointer-events-none mt-2">
        <div className="w-[180px] h-[180px] relative">
          <div
            className="absolute inset-4 rounded-full blur-2xl bg-[var(--accent)]/15"
          />
          <VinylEngine
            albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
            className="w-full h-full drop-shadow-xl"
          />
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="relative z-10 flex flex-col gap-4 shrink-0 pb-2 px-2 mt-2 app-region-no-drag">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            ref={fillRef}
            className="h-full origin-left will-change-transform bg-[var(--accent)]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer',
              showQueue
                ? 'text-[var(--accent)] bg-[var(--accent)]/15'
                : 'text-[var(--muted)] hover:bg-[var(--on-surface)]/5'
            )}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => playPrev()}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-[0.92] text-[var(--on-surface)] hover:bg-[var(--on-surface)]/[0.06]"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => togglePlayPause()}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-[0.95] bg-[var(--on-surface)] text-[var(--surface)] shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-[1px]" />
              )}
            </button>

            <button
              onClick={() => playNext()}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-[0.92] text-[var(--on-surface)] hover:bg-[var(--on-surface)]/[0.06]"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
          
          <div className="w-8 h-8" /> {/* Balance for queue button */}
        </div>
      </div>

      {/* Queue Overlay */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col p-4 app-region-no-drag backdrop-blur-3xl bg-[var(--panel-bg)]/95"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg">Up Next</h3>
              <button
                onClick={() => setShowQueue(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 relative -mx-4">
              <QueueView />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
