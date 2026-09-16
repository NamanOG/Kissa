import { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Quote, Disc } from 'lucide-react'
import { SleepTimer } from './SleepTimer'
import { RoomDimmer } from './RoomDimmer'


/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface ControlDockProps {
  className?: string
}

import { PlaybackClock } from '@renderer/utils/PlaybackClock'

const Scrubber = memo(() => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const duration = currentTrack?.duration ?? 0

  const [displayTime, setDisplayTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)

  const railRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const railWidthRef = useRef(0)

  // Track rail width for precise thumb translation without layout thrashing
  useEffect(() => {
    if (!railRef.current) return
    const ro = new ResizeObserver((entries) => {
      railWidthRef.current = entries[0].contentRect.width
    })
    ro.observe(railRef.current)
    return () => ro.disconnect()
  }, [])

  // PlaybackClock owns the shared timing loop; this subscriber only updates DOM state.
  useEffect(() => {
    let lastSecond = -1

    return PlaybackClock.subscribe((time) => {
      if (isDraggingRef.current) return // Ignore clock updates while user is scrubbing

      if (duration > 0 && railWidthRef.current > 0) {
        const elapsed = Math.max(0, Math.min(time, duration))
        const percent = elapsed / duration

        if (fillRef.current) {
          fillRef.current.style.transform = `scaleX(${percent})`
        }
        if (thumbRef.current) {
          // Move thumb exactly, centering its 10px width (-5px)
          const px = percent * railWidthRef.current - 5
          thumbRef.current.style.transform = `translate3d(${px}px, -50%, 0)`
        }

        const currentSecond = Math.floor(elapsed)
        if (currentSecond !== lastSecond) {
          lastSecond = currentSecond
          setDisplayTime(currentSecond)
        }
      }
    })
  }, [duration])

  const updateScrubberVisuals = (clientX: number) => {
    if (duration <= 0 || !railRef.current) return
    const rect = railRef.current.getBoundingClientRect()
    const clickX = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    const seekTime = ratio * duration
    const percent = ratio

    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${percent})`
    }
    if (thumbRef.current) {
      const px = percent * railWidthRef.current - 5
      thumbRef.current.style.transform = `translate3d(${px}px, -50%, 0)`
    }
    setDisplayTime(Math.floor(seekTime))
    return seekTime
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (duration <= 0 || !railRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    isDraggingRef.current = true
    updateScrubberVisuals(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    updateScrubberVisuals(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    isDraggingRef.current = false
    const finalSeekTime = updateScrubberVisuals(e.clientX)
    if (finalSeekTime !== undefined) {
      usePlayerStore.getState().seek(finalSeekTime)
    }
  }



  return (
    <div className="flex items-center gap-2 min-[900px]:gap-3 flex-1 min-w-[50px] min-[800px]:min-w-[100px] min-[1100px]:min-w-[160px]">
      <span className="font-mono text-[10px] min-[900px]:text-[11px] tabular-nums font-medium shrink-0 text-[var(--muted)]">
        {formatTime(displayTime)}
      </span>

      <div
        ref={railRef}
        className="relative flex-1 h-5 flex items-center cursor-pointer group touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-full h-[3px] rounded-full relative overflow-hidden bg-[var(--on-surface)]/20">
          <div
            ref={fillRef}
            className="h-full w-full rounded-full origin-left bg-[var(--accent)]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        {/* Thumb outside overflow-hidden rail to show shadow */}
        <div
          ref={thumbRef}
          className="absolute top-1/2 left-0 w-2.5 h-2.5 rounded-full shadow-[0_1px_4px_rgba(20,12,8,0.35)] transition-transform bg-[var(--accent)]"
          style={{ transform: 'translate3d(-5px, -50%, 0)' }}
        />
      </div>

      <span className="font-mono text-[10px] min-[900px]:text-[11px] tabular-nums font-medium shrink-0 text-[var(--muted)]">
        {formatTime(duration)}
      </span>
    </div>
  )
})
Scrubber.displayName = 'Scrubber'

export const ControlDock = memo(({ className }: ControlDockProps) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const activeView = usePlayerStore((s) => s.activeView)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)

  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)
  const setActiveView = usePlayerStore((s) => s.setActiveView)
  const hasTrack = currentTrack !== null
  const isLyricsActive = showSideLyrics

  const isExternalMedia = !!currentTrack?.sourceAppId

  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-between border transform-gpu overflow-hidden',
        'mx-2 mb-4 mt-2 h-[64px] min-[900px]:h-[72px] rounded-[36px] backdrop-blur-2xl shadow-2xl',
        'px-4 min-[900px]:px-8 min-[1200px]:px-10 select-none transition-all duration-ui ease-primary',
        !hasTrack && 'opacity-50 pointer-events-none',
        className
      )}
      style={{
        borderColor: 'var(--dock-border)',
        backgroundColor: 'var(--dock-bg)',
        boxShadow: 'var(--dock-shadow)'
      }}
    >
      {/* ── Dock Ambient Illumination ── */}
      <div
        className="absolute inset-0 rounded-[36px] pointer-events-none transition-opacity duration-ambient ease-primary"
        style={{
          opacity: 'calc(0.25 + 0.75 * var(--room-illumination, 1))'
        }}
      />

      {/* ── Left: Room Dial ─────────────────────────── */}
      <div className="relative z-10 flex items-center gap-2 min-[900px]:gap-3 w-[80px] min-[900px]:w-[120px] min-[1200px]:w-[150px] shrink-0">
        <RoomDimmer />
      </div>

      {/* ── Center: Transport Controls & Scrubber ─────────── */}
      <div
        className="relative z-10 flex items-center gap-2 min-[800px]:gap-4 min-[1100px]:gap-6 flex-1 max-w-[620px] justify-center mx-1.5 min-[900px]:mx-4 min-[1200px]:mx-6 transition-opacity duration-instant ease-primary"
        style={{ opacity: 'calc(0.4 + 0.6 * var(--room-illumination, 1))' }}
      >
        {/* Skip Back Button */}
        <button
          type="button"
          onClick={() => {
            if (currentTrack?.sourceAppId && window.electron?.mediaPrev) {
              window.electron.mediaPrev()
            } else {
              usePlayerStore.getState().playPrev()
            }
          }}
          aria-label="Previous track"
          className="transition-colors cursor-pointer active:scale-95 shrink-0 text-[var(--muted)] hover:text-[var(--on-surface)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 min-[900px]:h-[18px] min-[900px]:w-[18px] fill-current -translate-x-[1px]">
            <path d="M16 6.14v11.72c0 .77-.84 1.25-1.5.86l-9.8-5.86c-.64-.38-.64-1.34 0-1.72l9.8-5.86c.66-.39 1.5.09 1.5.86z" />
            <rect x="5" y="5" width="2" height="14" rx="1" />
          </svg>
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
            'relative h-10 w-10 min-[900px]:h-11 min-[900px]:w-11 rounded-full flex items-center justify-center cursor-pointer transition duration-ui ease-primary active:scale-[0.92] shrink-0 border hover:border-[var(--accent)] active:translate-y-px'
          )}
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--accent)',
            boxShadow: 'var(--panel-shadow)'
          }}
        >
          <div
            key={isPlaying ? 'pause' : 'play'}
            className="flex items-center justify-center transition-transform duration-100 ease-out"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] min-[900px]:h-[16px] min-[900px]:w-[16px] text-[var(--on-surface)] fill-current">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] min-[900px]:h-[16px] min-[900px]:w-[16px] text-[var(--on-surface)] fill-current ml-[2px]">
                <path d="M8 5.14v13.72c0 .77.84 1.25 1.5.86l11.43-6.86c.64-.38.64-1.34 0-1.72L9.5 4.28C8.84 3.89 8 4.37 8 5.14z" />
              </svg>
            )}
          </div>
        </button>

        {/* Skip Forward Button */}
        <button
          type="button"
          onClick={() => {
            if (currentTrack?.sourceAppId && window.electron?.mediaNext) {
              window.electron.mediaNext()
            } else {
              usePlayerStore.getState().playNext()
            }
          }}
          aria-label="Next track"
          className="transition-colors cursor-pointer active:scale-95 shrink-0 text-[var(--muted)] hover:text-[var(--on-surface)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 min-[900px]:h-[18px] min-[900px]:w-[18px] fill-current translate-x-[1px]">
            <path d="M8 6.14v11.72c0 .77.84 1.25 1.5.86l9.8-5.86c.64-.38.64-1.34 0-1.72L9.5 5.28C8.84 4.89 8 5.37 8 6.14z" />
            <rect x="17" y="5" width="2" height="14" rx="1" />
          </svg>
        </button>

        {/* Scrubber Bar Area */}
        <Scrubber />
      </div>

      {/* ── Right: Lyrics Toggle, Source Pill & Dynamic Equalizer ── */}
      <div
        className="relative z-10 flex items-center gap-1.5 min-[900px]:gap-2.5 shrink-0 justify-end transition-opacity duration-instant ease-primary"
        style={{ opacity: 'calc(0.4 + 0.6 * var(--room-illumination, 1))' }}
      >
        {/* Sleep Timer Popover */}
        <SleepTimer />

        {/* Apple Music Style Live Lyrics Toggle */}
        <button
          type="button"
          onClick={() => {
            if (activeView !== 'deck') {
              setActiveView('deck')
              if (!showSideLyrics) toggleSideLyrics()
            } else {
              toggleSideLyrics()
            }
          }}
          className={cn(
            'onboarding-lyrics flex items-center gap-1 px-2 min-[900px]:px-3 py-1 rounded-full border transition duration-ui ease-primary cursor-pointer select-none active:scale-95',
            isLyricsActive
              ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_12px_var(--accent)]'
              : 'border-[var(--panel-border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--on-surface)] hover:border-[var(--accent)]/50'
          )}
          title={isLyricsActive ? 'Hide Lyrics' : 'Show Synced Lyrics'}
          aria-label="Toggle Live Lyrics"
        >
          <Quote
            className={cn(
              'w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5',
              isLyricsActive ? 'text-[var(--accent)]' : 'currentColor'
            )}
          />
          <span className="hidden min-[760px]:inline font-mono text-[8.5px] min-[900px]:text-[9px] font-bold tracking-[0.14em] uppercase">
            Lyrics
          </span>
        </button>

        {/* Dynamic Source Pill */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 min-[900px]:px-2.5 py-1 rounded-full border transition-colors',
            'border-[var(--panel-border)] bg-[var(--surface)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
          )}
        >
          {currentTrack?.source?.toLowerCase().includes('apple') ? (
            <div className="w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5 rounded-full bg-[#fa243c] flex items-center justify-center shrink-0">
              <svg
                className="w-1.5 h-1.5 min-[900px]:w-2 min-[900px]:h-2 fill-white -translate-y-[0.5px]"
                viewBox="0 0 170 170"
              >
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.63-13.98-5.99-9.35-10.6-19.78-13.82-31.31-3.23-11.53-4.84-22.39-4.84-32.58 0-14.58 3.63-26.68 10.9-36.28 7.27-9.61 16.5-14.54 27.69-14.81 4.9 0 10.45 1.25 16.65 3.76 6.21 2.51 10.14 3.84 11.8 4 1.77-.16 5.86-1.54 12.28-4.14 6.42-2.6 11.95-3.79 16.59-3.56 12.44.68 22.32 5.37 29.62 14.07-10.89 6.67-16.22 15.82-16 27.46.22 9.08 3.78 16.71 10.68 22.89 6.9 6.18 15.13 9.77 24.69 10.77-2.12 6.55-4.7 13.04-7.75 19.46zM119.22 33.79c-.06-5.8 2.05-11.45 6.32-16.94 4.27-5.49 9.61-9.37 16.03-11.65.65 5.56-1.42 11.23-6.2 17.02-4.78 5.79-10.15 9.65-16.15 11.57z" />
              </svg>
            </div>
          ) : (
            <div className="w-3 h-3 min-[900px]:w-3.5 min-[900px]:h-3.5 rounded-full bg-[#1db954] flex items-center justify-center shrink-0">
              <svg
                className="w-1.5 h-1.5 min-[900px]:w-2 min-[900px]:h-2 fill-white"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
          )}
          <span
            className={cn(
              'font-mono text-[8.5px] min-[900px]:text-[9px] font-bold tracking-[0.14em] uppercase text-[var(--on-surface)] opacity-80'
            )}
          >
            {currentTrack?.source || 'System Audio'}
          </span>
        </div>

        {/* Start Listening Display */}
        <button
          type="button"
          onClick={() => usePlayerStore.getState().setIsListeningDisplay(true)}
          className={cn(
            'flex items-center justify-center w-[26px] h-[26px] min-[900px]:w-[28px] min-[900px]:h-[28px] rounded-full border transition duration-ui ease-primary cursor-pointer select-none active:scale-95',
            'border-transparent hover:border-[var(--panel-border)] bg-transparent hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--on-surface)]'
          )}
          title="Start Listening Display (D)"
          aria-label="Start Listening Display"
        >
          <Disc className="w-3.5 h-3.5 stroke-[1.75]" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => usePlayerStore.getState().toggleFullscreen()}
          className={cn(
            'flex items-center justify-center w-[26px] h-[26px] min-[900px]:w-[28px] min-[900px]:h-[28px] rounded-full border transition duration-ui ease-primary cursor-pointer select-none active:scale-95',
            isFullscreen
              ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] shadow-[0_0_12px_var(--accent)]'
              : 'border-transparent hover:border-[var(--panel-border)] bg-transparent hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--on-surface)]'
          )}
          title="Toggle Fullscreen (F11)"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M4 14h6v6h-2v-4H4v-2zm16 0h-6v6h2v-4h4v-2zM4 10h6V4H8v4H4v2zm16 0h-6V4h2v4h4v2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M2 2h6v2H4v4H2V2zm14 0h6v6h-2V4h-4V2zM2 22v-6h2v4h4v2H2zm20 0h-6v-2h4v-4h2v6z" />
            </svg>
          )}
        </button>


      </div>
    </div>
  )
})

ControlDock.displayName = 'ControlDock'
