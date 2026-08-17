import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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

export interface SyncedLyricsProps {
  className?: string
  lyricsSource?: string | null
  isLargeView?: boolean
}

/**
 * Apple Music-grade Synchronized Lyrics Component.
 * Features:
 * - Fluid depth-of-field blur & optical scaling on inactive lines
 * - Warm glowing focus on active lyric
 * - Smooth auto-centering spring scroll with manual user scroll suspension
 * - Interactive click-to-seek karaoke
 */
export const SyncedLyrics = memo(({
  className,
  lyricsSource,
  isLargeView = false
}: SyncedLyricsProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const progress = usePlayerStore((s) => s.progress)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const play = usePlayerStore((s) => s.play)

  const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'instrumental' | 'unavailable'>('loading')
  const [userIsScrolling, setUserIsScrolling] = useState(false)
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLDivElement>(null)
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        album: currentTrack.album,
        duration: currentTrack.duration
      })
      .then((res) => {
        if (cancelled) return
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
  }, [currentTrack?.title, currentTrack?.artist, currentTrack?.album, currentTrack?.duration, lyricsSource])

  // ── 2. Parse active lyrics array ──
  const lyricLines = useMemo(() => {
    if (!fetchedLyrics) return []
    return parseLrc(fetchedLyrics)
  }, [fetchedLyrics])

  // ── 3. Determine active line index based on current playback progress ──
  const activeIndex = useMemo(() => {
    if (lyricLines.length === 0) return -1
    for (let i = lyricLines.length - 1; i >= 0; i--) {
      if (progress >= lyricLines[i].time) {
        return i
      }
    }
    return 0
  }, [lyricLines, progress])

  // ── 4. Apple Music fluid auto-scroll centering ──
  const scrollToActive = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (userIsScrolling || !containerRef.current || !activeLineRef.current) return
    const container = containerRef.current
    const activeEl = activeLineRef.current

    const containerHeight = container.clientHeight
    const targetTop = activeEl.offsetTop - containerHeight * 0.42 + activeEl.clientHeight / 2

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior
      })
    } else {
      container.scrollTop = Math.max(0, targetTop)
    }
  }, [userIsScrolling])

  useEffect(() => {
    if (!userIsScrolling) {
      scrollToActive('smooth')
    }
  }, [activeIndex, scrollToActive, userIsScrolling])

  // Detect manual user scrolling to temporarily suspend auto-scroll
  const handleScroll = (): void => {
    setUserIsScrolling(true)
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current)
    }
    // Resume auto-scroll after 3.5s of no interaction
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false)
      scrollToActive('smooth')
    }, 3500)
  }

  // ── 5. Click-to-seek handler ──
  const handleLineClick = (time: number): void => {
    setProgress(time)
    play()
    if (typeof window !== 'undefined' && currentTrack?.sourceAppId && window.electron) {
      void window.electron.mediaPlayPause()
    }
    setUserIsScrolling(false)
  }

  return (
    <div
      className={cn(
        'relative flex flex-col h-full w-full select-none overflow-hidden',
        className
      )}
    >
      {/* Top & Bottom Depth Vignette Fades */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#181311] via-[#181311]/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#181311] via-[#181311]/80 to-transparent pointer-events-none z-20" />

      {/* Manual Scroll Sync Button */}
      {userIsScrolling && (
        <button
          type="button"
          onClick={() => {
            setUserIsScrolling(false)
            scrollToActive('smooth')
          }}
          className={cn(
            'absolute bottom-7 right-7 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
            'border border-white/[0.12] bg-[#2a211d]/90 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl',
            'font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7a76c] hover:text-[#f5efe6] transition-all'
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
        onWheel={handleScroll}
        onTouchMove={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto px-6 py-12 min-[900px]:px-10 no-scrollbar"
      >
        {status === 'ready' && lyricLines.length > 0 && (
          <div className="space-y-6 min-[900px]:space-y-8 py-[38vh]">
            {lyricLines.map((line, index) => {
              const isActive = index === activeIndex
              const distance = Math.abs(index - activeIndex)
              const isHovered = hoveredLineIndex === index

              // Apple Music style depth of field calculations
              let opacityClass = 'opacity-15'
              let blurStyle = 'blur(3px)'
              let scaleVal = 0.95

              if (isActive) {
                opacityClass = 'opacity-100'
                blurStyle = 'blur(0px)'
                scaleVal = isLargeView ? 1.03 : 1.02
              } else if (distance === 1) {
                opacityClass = isHovered ? 'opacity-70' : 'opacity-40'
                blurStyle = isHovered ? 'blur(0px)' : 'blur(1.2px)'
                scaleVal = 0.98
              } else if (distance === 2) {
                opacityClass = isHovered ? 'opacity-55' : 'opacity-25'
                blurStyle = isHovered ? 'blur(0.5px)' : 'blur(2.2px)'
                scaleVal = 0.96
              } else {
                opacityClass = isHovered ? 'opacity-40' : 'opacity-12'
                blurStyle = isHovered ? 'blur(1px)' : 'blur(3.5px)'
                scaleVal = 0.94
              }

              return (
                <motion.div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  onMouseEnter={() => setHoveredLineIndex(index)}
                  onMouseLeave={() => setHoveredLineIndex(null)}
                  className={cn(
                    'group relative cursor-pointer rounded-xl px-3 py-1.5 transition-all duration-300 transform-gpu',
                    isActive && 'cursor-default'
                  )}
                  style={{
                    filter: blurStyle,
                    transform: `scale(${scaleVal})`,
                    transformOrigin: 'left center'
                  }}
                >
                  <p
                    className={cn(
                      'font-serif tracking-[-0.015em] transition-colors duration-400',
                      isLargeView
                        ? 'text-[clamp(1.9rem,3.2vw,3.1rem)] leading-[1.08]'
                        : 'text-[clamp(1.35rem,2.1vw,1.95rem)] leading-[1.12]',
                      isActive
                        ? 'font-medium text-[#f5efe6] drop-shadow-[0_2px_12px_rgba(245,239,230,0.18)]'
                        : isHovered
                          ? 'text-[#d6c9bb]'
                          : 'text-[#9d9187]',
                      opacityClass
                    )}
                  >
                    {line.text}
                  </p>

                  {/* Subtle click cue on hover */}
                  {!isActive && isHovered && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#d7a76c] opacity-80">
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#d7a76c]/30 border-t-[#d7a76c] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#9d9187]">
              Syncing timed lyrics…
            </p>
          </div>
        )}

        {/* Instrumental State */}
        {status === 'instrumental' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
            <Music2 className="w-8 h-8 text-[#d7a76c]/60" />
            <p className="font-serif text-2xl text-[#f5efe6]/80">Instrumental</p>
            <p className="text-xs text-[#887b70]">No lyrics for this track</p>
          </div>
        )}

        {/* Unavailable State */}
        {status === 'unavailable' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="font-serif text-2xl text-[#f5efe6]/60">No Synced Lyrics</p>
            <p className="max-w-xs text-xs text-[#887b70]">
              Timed lyrics could not be found for {currentTrack?.title || 'this track'}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

SyncedLyrics.displayName = 'SyncedLyrics'
