import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { Music2, Play } from 'lucide-react'

export interface LyricLine {
  id: string
  time: number
  text: string
}

/** Built-in high-precision synced LRC lyrics for default track (Self Control - Frank Ocean) */
export const DEFAULT_SYNCED_LRC = `
[00:00.00] (Instrumental intro)
[00:03.50] Pool side convo, about your summer last night
[00:08.50] Ooh yeah, about your summer last night
[00:15.00] Ain't give you no play, mm
[00:19.50] Could I make you shine girl?
[00:23.00] Could I make you wait on me?
[00:27.50] If I could take it all back, I would
[00:32.00] You're in my head, you're in my head
[00:36.50] I, I, I know you gotta leave, leave, leave
[00:44.00] Take down some summer time
[00:47.50] Give up, just tonight, night, night
[00:54.00] I, I, I know you got someone comin'
[01:01.00] You're spittin' lost game
[01:04.50] Someone to take your heart
[01:07.50] Someone to make your head spin
[01:10.50] Keep a place for me, for me
[01:17.50] I'll sleep between y'all, it's nothing
[01:24.00] It's nothing, it's nothing
[01:31.00] Keep a place for me
[01:38.00] It's nothing, it's nothing
[01:45.00] It's nothing, it's nothing
[01:54.00] (Guitar interlude)
[02:03.00] Wish we'd grown up on the same street
[02:07.00] Done our thing, done our own thing
[02:11.00] Wish we'd grown up on the same street
[02:15.00] Done our thing, done our own thing
[02:19.00] I, I, I know you gotta leave, leave, leave
[02:26.00] Take down some summer time
[02:30.00] Give up, just tonight, night, night
[02:37.00] I, I, I know you got someone comin'
[02:44.00] You're spittin' lost game
[02:47.00] Keep a place for me, for me
[02:54.00] I'll sleep between y'all, it's nothing
[03:01.00] It's nothing, it's nothing
[03:08.00] Keep a place for me
[03:15.00] It's nothing, it's nothing
[03:22.00] It's nothing, it's nothing
[03:30.00] (Outro choir)
[03:40.00] I, I, I know you gotta leave, leave, leave
[03:52.00] Keep a place for me
`

export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = []
  const timestampRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g

  for (const rawRow of source.split('\n')) {
    const row = rawRow.trim()
    if (!row) continue
    const text = row.replace(timestampRegex, '').trim()
    if (!text) continue

    const matches = Array.from(row.matchAll(timestampRegex))
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const mins = Number(match[1])
      const secs = Number(match[2])
      const time = mins * 60 + secs
      lines.push({
        id: `${time}-${i}-${text.slice(0, 8)}`,
        time,
        text
      })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

interface LyricRowItemProps {
  line: LyricLine
  index: number
  isActive: boolean
  distance: number
  isHovered: boolean
  isLargeView: boolean
  isLightTheme: boolean
  onLineClick: (time: number) => void
  onHover: (index: number | null) => void
}

const LyricRowItem = memo(({
  line,
  index,
  isActive,
  distance,
  isHovered,
  isLargeView,
  isLightTheme,
  onLineClick,
  onHover
}: LyricRowItemProps): React.JSX.Element => {
  // Apple Music optical depth via GPU-accelerated opacity & scale
  let opacityClass = 'opacity-20'
  let scaleVal = 0.95

  if (isActive) {
    opacityClass = 'opacity-100'
    scaleVal = isLargeView ? 1.04 : 1.03
  } else if (distance === 1) {
    opacityClass = isHovered ? 'opacity-95' : isLightTheme ? 'opacity-65' : 'opacity-55'
    scaleVal = 0.98
  } else if (distance === 2) {
    opacityClass = isHovered ? 'opacity-80' : isLightTheme ? 'opacity-45' : 'opacity-35'
    scaleVal = 0.96
  } else {
    opacityClass = isHovered ? 'opacity-60' : isLightTheme ? 'opacity-30' : 'opacity-20'
    scaleVal = 0.94
  }

  const textColorClass = isLightTheme
    ? isActive
      ? 'font-bold text-[#14100d] drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
      : isHovered
        ? 'text-[#2a221b]'
        : 'text-[#524438]'
    : isActive
      ? 'font-bold text-[#ffffff] drop-shadow-[0_2px_14px_rgba(255,255,255,0.3)]'
      : isHovered
        ? 'text-[#e6dbcf]'
        : 'text-[#a8998b]'

  return (
    <div
      data-lyric-idx={index}
      onClick={() => onLineClick(line.time)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'group relative cursor-pointer rounded-xl px-3.5 py-2 transition-all duration-300 ease-out transform-gpu will-change-transform',
        isActive && 'cursor-default'
      )}
      style={{
        transform: `scale(${scaleVal})`,
        transformOrigin: 'left center',
        contain: 'layout style',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 48px'
      }}
    >
      {/* Active Line Glowing Amber Accent Indicator */}
      {isActive && (
        <div
          className={cn(
            'absolute -left-1.5 top-1/2 -translate-y-1/2 w-[3.5px] h-[70%] rounded-full transition-all duration-300',
            isLightTheme
              ? 'bg-[#b45309] shadow-[0_0_8px_rgba(180,83,9,0.55)]'
              : 'bg-[#d7a76c] shadow-[0_0_10px_rgba(215,167,108,0.8)]'
          )}
        />
      )}

      <p
        className={cn(
          'font-serif tracking-[-0.015em] transition-all duration-300 ease-out',
          isLargeView
            ? 'text-[clamp(1.9rem,3.2vw,3.1rem)] leading-[1.08]'
            : 'text-[clamp(1.35rem,2.1vw,1.95rem)] leading-[1.12]',
          textColorClass,
          opacityClass
        )}
      >
        {line.text}
      </p>

      {/* Subtle click cue on hover */}
      {!isActive && isHovered && (
        <div
          className={cn(
            'absolute -left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-80 pointer-events-none',
            isLightTheme ? 'text-[#b45309]' : 'text-[#d7a76c]'
          )}
        >
          <Play className="w-3 h-3 fill-current" />
        </div>
      )}
    </div>
  )
})

LyricRowItem.displayName = 'LyricRowItem'

export interface SyncedLyricsProps {
  className?: string
  lyricsSource?: string | null
  isLargeView?: boolean
}

export const SyncedLyrics = memo(({
  className,
  lyricsSource,
  isLargeView = false
}: SyncedLyricsProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const play = usePlayerStore((s) => s.play)
  const theme = usePlayerStore((s) => s.theme)

  const isLightTheme = theme === 'sunday-morning' || theme === 'concrete-vinyl'

  const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'instrumental' | 'unavailable'>('loading')
  const [userIsScrolling, setUserIsScrolling] = useState(false)
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollAnimRef = useRef<number | null>(null)
  const isProgrammaticScrollRef = useRef(false)

  // ── 1. Fetch live LRC lyrics via Electron IPC or fall back to default track lyrics ──
  useEffect(() => {
    let cancelled = false

    if (!currentTrack) {
      setFetchedLyrics(null)
      setStatus('unavailable')
      return
    }

    // Default sample track built-in lyrics
    if (
      currentTrack.title.toLowerCase().includes('self control') &&
      currentTrack.artist.toLowerCase().includes('frank ocean')
    ) {
      setFetchedLyrics(DEFAULT_SYNCED_LRC)
      setStatus('ready')
      return
    }

    if (lyricsSource) {
      setFetchedLyrics(lyricsSource)
      setStatus('ready')
      return
    }

    if (!window.electron?.getLyrics) {
      setFetchedLyrics(null)
      setStatus('unavailable')
      return
    }

    setStatus('loading')
    setFetchedLyrics(null)

    window.electron
      .getLyrics({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || '',
        duration: currentTrack.duration || 0
      })
      .then((res) => {
        if (cancelled) return

        // If lyrics service discovered track duration and store doesn't have it yet, backfill it
        if (res?.duration && res.duration > 0) {
          const storeTrack = usePlayerStore.getState().currentTrack
          if (storeTrack && (!storeTrack.duration || storeTrack.duration === 0)) {
            usePlayerStore.setState((s) => ({
              currentTrack: s.currentTrack ? { ...s.currentTrack, duration: res.duration! } : null
            }))
          }
        }

        if (res?.instrumental) {
          setStatus('instrumental')
          return
        }
        if (res?.syncedLyrics) {
          setFetchedLyrics(res.syncedLyrics)
          setStatus('ready')
        } else if (res?.plainLyrics) {
          // Plain unsynced fallback
          const fakeLines = res.plainLyrics
            .split('\n')
            .filter((l) => l.trim())
            .map((text, idx) => `[00:${String(idx * 4).padStart(2, '0')}.00] ${text}`)
            .join('\n')
          setFetchedLyrics(fakeLines)
          setStatus('ready')
        } else {
          setStatus('unavailable')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })

    return (): void => {
      cancelled = true
    }
  }, [currentTrack?.title, currentTrack?.artist, currentTrack?.album, lyricsSource])

  // ── 2. Parse active lyrics array ──
  const lyricLines = useMemo(() => {
    if (!fetchedLyrics) return []
    return parseLrc(fetchedLyrics)
  }, [fetchedLyrics])

  // ── 3. High-efficiency active index subscriber (Zero React re-render churn during line playback) ──
  const [activeIndex, setActiveIndex] = useState(-1)
  const lyricLinesRef = useRef(lyricLines)
  lyricLinesRef.current = lyricLines

  useEffect(() => {
    const calcIndex = (prog: number): number => {
      const lines = lyricLinesRef.current
      if (lines.length === 0) return -1
      for (let i = lines.length - 1; i >= 0; i--) {
        if (prog >= lines[i].time) {
          return i
        }
      }
      return 0
    }

    setActiveIndex(calcIndex(usePlayerStore.getState().progress))

    let prevIdx = -1
    const unsub = usePlayerStore.subscribe((state) => {
      const newIdx = calcIndex(state.progress)
      if (newIdx !== prevIdx) {
        prevIdx = newIdx
        setActiveIndex(newIdx)
      }
    })

    return unsub
  }, [lyricLines])

  // ── 4. Apple Music fluid auto-scroll with zero-lag spring/ease interpolation ──
  const smoothScrollTo = useCallback((targetTop: number) => {
    if (!containerRef.current) return
    const container = containerRef.current
    const startTop = container.scrollTop
    const distance = targetTop - startTop
    if (Math.abs(distance) < 1.5) return

    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null
    }

    isProgrammaticScrollRef.current = true
    const startTime = performance.now()
    const duration = Math.min(380, Math.max(200, Math.abs(distance) * 0.48))

    const step = (currentTime: number): void => {
      const elapsed = currentTime - startTime
      const p = Math.min(1, elapsed / duration)
      // Apple fluid cubic-bezier ease out: 1 - (1 - p)^3.5
      const ease = 1 - Math.pow(1 - p, 3.5)
      container.scrollTop = startTop + distance * ease

      if (p < 1) {
        scrollAnimRef.current = requestAnimationFrame(step)
      } else {
        scrollAnimRef.current = null
        setTimeout(() => {
          isProgrammaticScrollRef.current = false
        }, 50)
      }
    }

    scrollAnimRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    if (userIsScrolling || activeIndex < 0 || !containerRef.current) return
    const container = containerRef.current
    const activeEl = container.querySelector(`[data-lyric-idx="${activeIndex}"]`) as HTMLElement | null
    if (!activeEl) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const currentRelativeTop = activeRect.top - containerRect.top + container.scrollTop
    const containerHeight = container.clientHeight
    // Center active line at 42% optical focus
    const targetTop = currentRelativeTop - containerHeight * 0.42 + activeEl.clientHeight / 2
    smoothScrollTo(Math.max(0, targetTop))
  }, [activeIndex, userIsScrolling, smoothScrollTo])

  // Detect manual user scrolling to temporarily suspend auto-scroll
  const handleUserInteraction = (): void => {
    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null
    }
    isProgrammaticScrollRef.current = false
    setUserIsScrolling(true)
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current)
    }
    // Resume auto-scroll after 3s of no interaction
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false)
    }, 3000)
  }

  const handleScroll = (): void => {
    // If this scroll event came from our programmatic smooth scroll, do not cancel auto-scroll!
    if (isProgrammaticScrollRef.current) {
      return
    }
    handleUserInteraction()
  }

  // ── 5. Click-to-seek handler ──
  const handleLineClick = useCallback((time: number): void => {
    setProgress(time)
    play()
    if (typeof window !== 'undefined' && currentTrack?.sourceAppId && window.electron) {
      void window.electron.mediaPlayPause()
    }
    setUserIsScrolling(false)
  }, [currentTrack?.sourceAppId, play, setProgress])

  const handleHover = useCallback((index: number | null): void => {
    setHoveredLineIndex(index)
  }, [])

  return (
    <div
      className={cn(
        'relative flex flex-col h-full w-full select-none overflow-hidden',
        className
      )}
    >
      {/* Manual Scroll Sync Button */}
      {userIsScrolling && (
        <button
          type="button"
          onClick={() => {
            setUserIsScrolling(false)
          }}
          className={cn(
            'absolute bottom-7 right-7 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-xl transition-all',
            isLightTheme
              ? 'border border-black/[0.12] bg-[#f2e8d2]/95 shadow-[0_8px_24px_rgba(0,0,0,0.15)] text-[#b45309] hover:text-[#181411]'
              : 'border border-white/[0.12] bg-[#2a211d]/90 shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-[#d7a76c] hover:text-[#f5efe6]',
            'font-mono text-[10px] font-bold uppercase tracking-[0.16em]'
          )}
        >
          <Music2 className="w-3 h-3" />
          <span>Sync View</span>
        </button>
      )}

      {/* Scrolling Lyrics Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleUserInteraction}
        onTouchMove={handleUserInteraction}
        onPointerDown={(e) => {
          // If clicking background or scrollbar (not lyric text), mark user interaction
          if (e.target === containerRef.current) {
            handleUserInteraction()
          }
        }}
        className="relative flex-1 min-h-0 overflow-y-auto px-6 py-12 min-[900px]:px-10 no-scrollbar"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
        }}
      >
        {status === 'ready' && lyricLines.length > 0 && (
          <div className="space-y-6 min-[900px]:space-y-8 py-[45vh]">
            {lyricLines.map((line, index) => {
              const isActive = index === activeIndex
              const distance = Math.abs(index - activeIndex)
              const isHovered = hoveredLineIndex === index

              return (
                <LyricRowItem
                  key={line.id}
                  line={line}
                  index={index}
                  isActive={isActive}
                  distance={distance}
                  isHovered={isHovered}
                  isLargeView={isLargeView}
                  isLightTheme={isLightTheme}
                  onLineClick={handleLineClick}
                  onHover={handleHover}
                />
              )
            })}
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 animate-spin',
                isLightTheme
                  ? 'border-[#b45309]/30 border-t-[#b45309]'
                  : 'border-[#d7a76c]/30 border-t-[#d7a76c]'
              )}
            />
            <p
              className={cn(
                'font-mono text-xs uppercase tracking-[0.18em]',
                isLightTheme ? 'text-[#7a6c5f]' : 'text-[#9d9187]'
              )}
            >
              Syncing timed lyrics…
            </p>
          </div>
        )}

        {/* Instrumental State */}
        {status === 'instrumental' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
            <Music2
              className={cn(
                'w-8 h-8',
                isLightTheme ? 'text-[#b45309]/80' : 'text-[#d7a76c]/60'
              )}
            />
            <p
              className={cn(
                'font-serif text-2xl',
                isLightTheme ? 'text-[#181411]/90 font-medium' : 'text-[#f5efe6]/80'
              )}
            >
              Instrumental
            </p>
            <p
              className={cn(
                'text-xs',
                isLightTheme ? 'text-[#7a6c5f]' : 'text-[#887b70]'
              )}
            >
              No lyrics for this track
            </p>
          </div>
        )}

        {/* Unavailable State */}
        {status === 'unavailable' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
            <p
              className={cn(
                'font-serif text-2xl',
                isLightTheme ? 'text-[#181411]/80 font-medium' : 'text-[#f5efe6]/60'
              )}
            >
              No Synced Lyrics
            </p>
            <p
              className={cn(
                'max-w-xs text-xs',
                isLightTheme ? 'text-[#7a6c5f]' : 'text-[#887b70]'
              )}
            >
              Timed lyrics could not be found for {currentTrack?.title || 'this track'}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

SyncedLyrics.displayName = 'SyncedLyrics'
