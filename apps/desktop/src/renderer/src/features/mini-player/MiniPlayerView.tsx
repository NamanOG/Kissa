import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { VinylEngine } from '@renderer/features/vinyl'
import { Play, Pause, SkipBack, SkipForward, Maximize2, ListMusic, X } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { StudyChip } from '@renderer/features/study/StudyChip'
import { useT } from '@renderer/i18n'
import { beatOf } from '@renderer/utils/frameBeat'

/**
 * Whether Moving light shows behind the mini player: the same saved setting as the Deck (with
 * Match the album and a cover). The light itself is the app's one renderer in the background
 * layer (FluidAmbient), which keeps running in the mini window, so the panel lets it through.
 */
export const useMiniMovingLight = (): boolean =>
  usePlayerStore((s) => s.theme === 'adaptive' && s.ambientMotion && Boolean(s.currentTrack?.artworkUrl))

export const MiniPlayerView = (): React.JSX.Element => {
  const t = useT()
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const theme = usePlayerStore((s) => s.theme)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const playNext = usePlayerStore((s) => s.playNext)
  const playPrev = usePlayerStore((s) => s.playPrev)
  const toggleMiniPlayer = usePlayerStore((s) => s.toggleMiniPlayer)
  const isMiniPlayer = usePlayerStore((s) => s.isMiniPlayer)
  const movingLight = useMiniMovingLight()

  const duration = currentTrack?.duration ?? 0

  const [showQueue, setShowQueue] = useState(false)
  const reduceMotion = useReducedMotion()

  // Only the record shows until the pointer comes over the window; then the title, the play
  // bar and the buttons fade in, and they fade away again a moment after it leaves. They also
  // show for a few seconds on opening, so it is clear they are there.
  const [awake, setAwake] = useState(true)
  const sleepTimer = useRef<number | undefined>(undefined)
  const wake = useCallback((): void => {
    window.clearTimeout(sleepTimer.current)
    setAwake(true)
  }, [])
  const sleepSoon = useCallback((ms: number): void => {
    window.clearTimeout(sleepTimer.current)
    sleepTimer.current = window.setTimeout(() => setAwake(false), ms)
  }, [])
  useEffect(() => {
    if (!isMiniPlayer) return
    setAwake(true)
    sleepSoon(2600)
    // The window is a drag area, so the main process says when the cursor is over it.
    const off = window.electron?.onMiniHover?.((inside) => (inside ? wake() : sleepSoon(900)))
    return () => {
      off?.()
      window.clearTimeout(sleepTimer.current)
    }
  }, [isMiniPlayer, wake, sleepSoon])
  const shown = awake || showQueue
  const fade = { duration: reduceMotion ? 0.12 : shown ? 0.28 : 0.5, ease: [0.22, 1, 0.36, 1] as const }

  // A track from another player (Apple Music, Spotify…) is driven through Windows media
  // controls, the same way the main dock and full screen do it; the local queue is only for
  // Kissa's own playback.
  const handlePlayPause = (): void => {
    togglePlayPause()
    if (currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
      window.__kissaMediaCommandCooldown?.()
      window.electron.mediaPlayPause()
    }
  }
  const handlePrev = (): void => {
    if (currentTrack?.sourceAppId && window.electron?.mediaPrev) window.electron.mediaPrev()
    else playPrev()
  }
  const handleNext = (): void => {
    if (currentTrack?.sourceAppId && window.electron?.mediaNext) window.electron.mediaNext()
    else playNext()
  }
  
  const fillRef = useRef<HTMLDivElement>(null)
  const shownRef = useRef(shown)
  shownRef.current = shown

  useEffect(() => {
    if (!isMiniPlayer) return

    let rafId: number
    let lastBeat = -1

    // The bar moves a pixel or two a second, so it steps on the shared 30 Hz beat (with the
    // record and Moving light) and rests while the controls are hidden: written on every refresh
    // it cost a style pass per frame, 140 a second on a 144 Hz display.
    const updateScrubber = (t: number) => {
      rafId = requestAnimationFrame(updateScrubber)
      const beat = beatOf(t, 2)
      if (beat === lastBeat || !shownRef.current) return
      lastBeat = beat
      if (duration > 0 && fillRef.current) {
        const time = PlaybackClock.getCurrentTime()
        const elapsed = Math.max(0, Math.min(time, duration))
        const percent = elapsed / duration
        fillRef.current.style.transform = `scaleX(${percent})`
      } else if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(0)`
      }
    }

    rafId = requestAnimationFrame(updateScrubber)
    return () => cancelAnimationFrame(rafId)
  }, [duration, isMiniPlayer])

  return (
    <div
      data-chrome={shown ? 'shown' : 'hidden'}
      data-moving-light={movingLight ? '' : undefined}
      onPointerMove={wake}
      onPointerLeave={() => sleepSoon(900)}
      onFocusCapture={wake}
      onBlurCapture={() => sleepSoon(1600)}
      className={cn(
        "relative flex flex-col w-full h-full p-4 overflow-hidden select-none transition-colors duration-ambient ease-ambient text-ink",
        movingLight ? 'bg-transparent' : 'bg-[var(--panel-bg)]',
        isMiniPlayer && "app-region-drag"
      )}
    >
      {movingLight && (
        // Moving light shows through faintly: the panel's own colour over most of it, and a
        // little deeper at the top and bottom where the title and the controls fade in. A plain
        // static shade, no blur over the moving colour.
        <div
          aria-hidden="true"
          data-mini-scrim=""
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 26%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.48) 100%), color-mix(in srgb, var(--panel-bg) 58%, transparent)'
          }}
        />
      )}
      <motion.div
        initial={false}
        animate={{ opacity: shown ? 1 : 0, y: shown || reduceMotion ? 0 : -6 }}
        transition={fade}
        className={cn(
          'relative z-10 flex items-center justify-between mt-2 shrink-0 px-2',
          shown ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
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
              <h3 className="font-serif text-lg font-medium line-clamp-1 tracking-tight text-ink">
                {currentTrack?.title ?? 'Kissa'}
              </h3>
              <p className="text-xs line-clamp-1 text-dim">
                {currentTrack?.artist ?? t('mini.waiting')}
              </p>
            </motion.div>
          </AnimatePresence>
          <StudyChip className="mt-1.5" />
        </div>
        
        <button
          type="button"
          onClick={() => toggleMiniPlayer()}
          aria-label={t('mini.restore')}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-ui ease-primary cursor-pointer app-region-no-drag text-dim hover:text-ink hover:bg-ink/[0.05]"
          title={t('mini.restore')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </motion.div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center pointer-events-none mt-2">
        {/* With the controls away the record grows into the space they leave. */}
        <motion.div
          initial={false}
          animate={{ scale: shown || reduceMotion ? 1 : 1.38 }}
          transition={{ duration: shown ? 0.4 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-[180px] h-[180px] relative"
        >
          <div
            className="absolute inset-4 rounded-full blur-2xl bg-tone/15"
          />
          <VinylEngine
            albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
            className="w-full h-full drop-shadow-xl"
          />
        </motion.div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: shown ? 1 : 0, y: shown || reduceMotion ? 0 : 8 }}
        transition={fade}
        className={cn(
          'relative z-10 flex flex-col gap-4 shrink-0 pb-2 px-2 mt-2',
          // Hidden controls give the window back to dragging.
          shown ? 'app-region-no-drag' : 'pointer-events-none'
        )}
      >
        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            ref={fillRef}
            className="h-full origin-left will-change-transform bg-tone"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            aria-label={showQueue ? t('mini.hideQueue') : t('mini.showQueue')}
            aria-pressed={showQueue}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-ui ease-primary cursor-pointer',
              showQueue
                ? 'text-tone bg-tone/15'
                : 'text-dim hover:bg-ink/5'
            )}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePrev}
              aria-label={t('dock.prev')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-[color,background-color,transform] duration-ui ease-primary cursor-pointer active:scale-95 text-ink hover:bg-ink/[0.06]"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? t('dock.pause') : t('dock.play')}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-ui ease-primary cursor-pointer active:scale-95 bg-ink text-[var(--surface)] shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-[1px]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label={t('dock.next')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-[color,background-color,transform] duration-ui ease-primary cursor-pointer active:scale-95 text-ink hover:bg-ink/[0.06]"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
          
          <div className="w-8 h-8" /> {/* Balance for queue button */}
        </div>
      </motion.div>

      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col p-4 app-region-no-drag bg-[var(--panel-bg)]"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-kissa-editorial text-lg text-ink">Up Next</h3>
              <button
                type="button"
                onClick={() => setShowQueue(false)}
                aria-label={t('mini.closeQueue')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 relative -mx-4">
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
