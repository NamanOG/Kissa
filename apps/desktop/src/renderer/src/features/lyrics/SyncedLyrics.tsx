import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { Music2, Play, Quote } from 'lucide-react'

export interface LyricToken {
  text: string
  startTime: number
  endTime: number
  isWhitespace?: boolean
}

export interface LyricLine {
  id: string
  time: number
  text: string
  tokens?: LyricToken[]
  endTime?: number
  timingType?: 'estimated' | 'real'
}


export function parseLrc(source: string, offsetSeconds: number = 0.45): LyricLine[] {
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
      // Calibrated offset so lyrics sync tightly to audible vocals (compensating for audio output buffer & SMTC lead)
      const time = Math.max(0, mins * 60 + secs + offsetSeconds)
      lines.push({
        id: `${time}-${i}-${text.slice(0, 8)}`,
        time,
        text,
        timingType: 'estimated'
      })
    }
  }

  lines.sort((a, b) => a.time - b.time)

  // Tokenize and estimate timing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    // Cap max estimated duration per line to 8 seconds.
    let lineDuration = nextLine ? nextLine.time - line.time : 6
    if (lineDuration > 8) lineDuration = 8

    line.endTime = line.time + lineDuration

    // Tokenize text keeping whitespace
    const wordsAndSpaces = line.text.match(/(\S+|\s+)/g) || []

    let totalWeight = 0
    wordsAndSpaces.forEach(w => {
      totalWeight += Math.max(1, w.trim().length)
    })

    const tokens: LyricToken[] = []
    let currentTokenTime = line.time

    for (const w of wordsAndSpaces) {
      const isWhitespace = !w.trim()
      const weight = Math.max(1, w.trim().length)
      const tokenDuration = (weight / totalWeight) * lineDuration

      tokens.push({
        text: w,
        startTime: currentTokenTime,
        endTime: currentTokenTime + tokenDuration,
        isWhitespace
      })
      currentTokenTime += tokenDuration
    }

    line.tokens = tokens
  }

  return lines
}

interface LyricRowItemProps {
  line: LyricLine
  index: number
  isActive: boolean
  distance: number
  isHovered: boolean
  isLargeView: boolean

  onLineClick: (time: number) => void
  onHover: (index: number | null) => void
}

const LyricRowItem = memo(
  ({
    line,
    index,
    isActive,
    distance,
    isHovered,
    isLargeView,
    onLineClick,
    onHover
  }: LyricRowItemProps): React.JSX.Element => {
    const containerRef = useRef<HTMLParagraphElement>(null)

    // Apply high-performance CSS progression without React re-renders
    useEffect(() => {
      if (!isActive || !containerRef.current || !line.tokens) return

      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (isReducedMotion) {
        // Do not animate word progression
        const spans = containerRef.current.querySelectorAll('.lyric-word')
        spans.forEach((span) => {
          ; (span as HTMLElement).style.setProperty('--word-progress', '100%')
        })
        return
      }

      const spans = Array.from(containerRef.current.querySelectorAll('.lyric-word')) as HTMLElement[]

      return PlaybackClock.subscribe((time) => {
        line.tokens!.forEach((token, i) => {
          const span = spans[i]
          if (!span) return
          let progress = 0
          if (time >= token.endTime) {
            progress = 1
          } else if (time > token.startTime) {
            progress = (time - token.startTime) / (token.endTime - token.startTime)
          }
          span.style.setProperty('--word-progress', `${progress * 100}%`)
        })
      })
    }, [isActive, line.tokens])

    // Premium optical depth via restrained typography, opacity, scale & subtle filter
    let opacityClass = 'opacity-[0.15]'
    let scaleVal = 0.96
    let blurVal = 'blur(1.0px)'
    let weightClass = 'font-normal'

    if (isActive) {
      opacityClass = 'opacity-100'
      scaleVal = 1.01
      blurVal = 'blur(0px)'
      weightClass = 'font-semibold'
    } else if (distance === 1) {
      opacityClass = isHovered ? 'opacity-60' : 'opacity-[0.30]'
      scaleVal = 0.99
      blurVal = 'blur(0px)'
      weightClass = 'font-normal'
    } else if (distance === 2) {
      opacityClass = isHovered ? 'opacity-40' : 'opacity-[0.20]'
      scaleVal = 0.98
      blurVal = 'blur(0.5px)'
      weightClass = 'font-normal'
    } else {
      opacityClass = isHovered ? 'opacity-30' : 'opacity-[0.15]'
      scaleVal = 0.96
      blurVal = 'blur(1.0px)'
      weightClass = 'font-normal'
    }

    const textColorClass = 'text-[var(--on-surface)]'

    return (
      <div
        data-lyric-idx={index}
        onClick={() => onLineClick(line.time)}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
        className={cn(
          'group relative cursor-pointer rounded-xl px-3.5 py-2.5 transition-[opacity,transform,filter] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu will-change-transform',
          isActive && 'cursor-default'
        )}
        style={{
          transform: `scale(${scaleVal})`,
          transformOrigin: 'left center',
          filter: blurVal
        }}
      >
        <p
          ref={containerRef}
          className={cn(
            'font-[Inter] tracking-[-0.015em] transition-colors duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] py-1',
            isLargeView
              ? 'text-[clamp(1.9rem,3.2vw,3.1rem)] leading-[1.3]'
              : 'text-[clamp(1.4rem,2.2vw,2.05rem)] leading-[1.25]',
            textColorClass,
            opacityClass,
            weightClass
          )}
        >
          {line.tokens ? (
            line.tokens.map((token, i) => {
              if (token.isWhitespace) {
                return <span key={i} className="whitespace-pre">{token.text}</span>
              }
              return (
                <span
                  key={i}
                  className="lyric-word relative inline-block pb-[0.1em]"
                  style={{
                    color: isActive ? 'transparent' : 'inherit',
                    backgroundClip: isActive ? 'text' : 'border-box',
                    WebkitBackgroundClip: isActive ? 'text' : 'border-box',
                    backgroundImage: isActive
                      ? 'linear-gradient(to right, var(--on-surface) var(--word-progress, 0%), color-mix(in srgb, var(--on-surface) 38%, transparent) var(--word-progress, 0%))'
                      : 'none',
                  }}
                >
                  {token.text}
                </span>
              )
            })
          ) : (
            line.text
          )}
        </p>

        {/* Subtle click cue on hover */}
        {!isActive && isHovered && (
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-80 pointer-events-none text-[var(--accent)]">
            <Play className="w-3 h-3 fill-current" />
          </div>
        )}
      </div>
    )
  }
)

LyricRowItem.displayName = 'LyricRowItem'

export interface SyncedLyricsProps {
  className?: string
  lyricsSource?: string | null
  isLargeView?: boolean
}

export const SyncedLyrics = memo(
  ({ className, lyricsSource, isLargeView = false }: SyncedLyricsProps): React.JSX.Element => {
    const currentTrack = usePlayerStore((s) => s.currentTrack)
    const setProgress = usePlayerStore((s) => s.setProgress)
    const play = usePlayerStore((s) => s.play)
    const isPlaying = usePlayerStore((s) => s.isPlaying)
    const theme = usePlayerStore((s) => s.theme)
    const lyricsOffset = usePlayerStore((s) => s.lyricsOffset)

    const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null)
    const [status, setStatus] = useState<
      'loading' | 'ready' | 'instrumental' | 'unavailable' | 'waiting'
    >('loading')
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
        setStatus('waiting')
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
      return parseLrc(fetchedLyrics, 0.45 + (lyricsOffset || 0))
    }, [fetchedLyrics, lyricsOffset])

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

      let prevIdx = -1

      return PlaybackClock.subscribe((time) => {
        const newIdx = calcIndex(time)

        if (newIdx !== prevIdx) {
          prevIdx = newIdx
          setActiveIndex(newIdx)
        }
      })
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

      // If it's a huge distance (like seeking across the song), snap instantly
      // instead of animating through every intermediate line.
      if (Math.abs(distance) > container.clientHeight * 1.5) {
        container.scrollTop = targetTop
        setTimeout(() => {
          isProgrammaticScrollRef.current = false
        }, 50)
        return
      }

      const startTime = performance.now()
      const duration = Math.min(800, Math.max(400, Math.abs(distance) * 1.5))

      const step = (currentTime: number): void => {
        const elapsed = currentTime - startTime
        const p = Math.min(1, elapsed / duration)
        // Extremely fluid cubic-bezier ease out: 1 - (1 - p)^4
        const ease = 1 - Math.pow(1 - p, 4)
        container.scrollTop = startTop + distance * ease

        if (p < 1) {
          scrollAnimRef.current = requestAnimationFrame(step)
        } else {
          scrollAnimRef.current = null
          setTimeout(() => {
            isProgrammaticScrollRef.current = false
          }, 100)
        }
      }

      scrollAnimRef.current = requestAnimationFrame(step)
    }, [])

    useEffect(() => {
      if (userIsScrolling || activeIndex < 0 || !containerRef.current) return
      const container = containerRef.current
      const activeEl = container.querySelector(
        `[data-lyric-idx="${activeIndex}"]`
      ) as HTMLElement | null
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



    // ── 5. Click-to-seek handler ──
    const handleLineClick = useCallback(
      (time: number): void => {
        setProgress(time)
        play()
        if (typeof window !== 'undefined' && currentTrack?.sourceAppId && window.electron) {
          void window.electron.mediaPlayPause()
        }
        setUserIsScrolling(false)
      },
      [currentTrack?.sourceAppId, play, setProgress]
    )

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
              'absolute bottom-7 right-7 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-xl transition-[opacity,transform]',
              'border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--panel-shadow)] text-[var(--accent)] hover:text-[var(--on-surface)]',
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
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
          }}
        >
          {status === 'ready' && lyricLines.length > 0 && (
            <div className="space-y-8 min-[900px]:space-y-12 py-[45vh]">
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
              <div className="w-5 h-5 rounded-full border-2 animate-spin border-[var(--accent)]/30 border-t-[var(--accent)]" />
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Syncing timed lyrics…
              </p>
            </div>
          )}

          {/* Instrumental State */}
          {status === 'instrumental' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="flex gap-2.5 items-center justify-center h-8 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 motion-safe:animate-pulse [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 motion-safe:animate-pulse [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 motion-safe:animate-pulse" />
              </div>
              <p className="font-serif text-2xl text-[var(--on-surface)] opacity-90">
                Instrumental
              </p>
              <p className="text-xs text-[var(--muted)]">No lyrics for this track</p>
            </div>
          )}

          {/* Unavailable State */}
          {status === 'unavailable' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
              <p className="font-serif text-2xl text-[var(--on-surface)] opacity-80">
                No Synced Lyrics
              </p>
              <p className="max-w-xs text-xs text-[var(--muted)]">
                Timed lyrics could not be found for {currentTrack?.title || 'this track'}.
              </p>
            </div>
          )}

          {/* Waiting for Music State */}
          {status === 'waiting' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="w-16 h-16 min-[900px]:w-20 min-[900px]:h-20 rounded-full mb-4 flex items-center justify-center opacity-40 bg-[var(--accent)]/10">
                <Quote className="w-8 h-8 min-[900px]:w-10 min-[900px]:h-10 opacity-60 text-[var(--accent)]" />
              </div>
              <p className="font-serif text-2xl min-[900px]:text-3xl text-[var(--on-surface)] opacity-90">
                Waiting for Music
              </p>
              <p className="max-w-sm text-sm text-[var(--muted)]">
                Lyrics will appear here when a track starts playing.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }
)

SyncedLyrics.displayName = 'SyncedLyrics'
