import { prefersReducedMotion } from '@renderer/hooks/useReducedMotion'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { Bookmark, LocateFixed, Play, Quote, RotateCw, X } from 'lucide-react'
import { savedLineId, useSavedLinesStore } from '@renderer/stores/savedLinesStore'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { useT } from '@renderer/i18n'
import { parseLrc, WORD_LEAD_SECONDS, type LyricLine } from './lrc'
import { LyricsRecovery } from './LyricsRecovery'
import { LyricsMenu } from './LyricsMenu'

export { parseLrc } from './lrc'
export type { LyricLine, LyricToken } from './lrc'

type LyricsStatus =
  'loading' | 'synced' | 'plain' | 'instrumental' | 'unavailable' | 'unreachable' | 'waiting'

/** How long the source must hold a duration before lyrics are looked up with it. */
const LOOKUP_SETTLE_MS = 350
/** A line starts lighting a moment early, so its 250 ms fade is complete as the vocal lands. */
const LEAD_IN_SECONDS = 0.15
/** A silence at least this long between lines shows the "interlude" dots. */
const INTERLUDE_SECONDS = 5
/** When the lyrics library could not be reached, try once more on its own after this. */
/** Automatic retries after the library was busy or unreachable: soon at first, then less often. */
const AUTO_RETRY_MS = [3_000, 10_000, 30_000, 60_000]

const RETRY_BUTTON_CLASS =
  'mt-4 flex items-center gap-1.5 rounded-full border border-panel-line bg-[var(--panel-bg)] px-3.5 py-1.5 text-[12.5px] font-medium text-tone shadow-[var(--panel-shadow)] transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone'

const SIZE_CLASSES = {
  large: {
    s: 'text-[clamp(1.5rem,2.4vw,2.3rem)] leading-[1.32]',
    m: 'text-[clamp(1.9rem,3.2vw,3.1rem)] leading-[1.3]',
    l: 'text-[clamp(2.3rem,3.9vw,3.8rem)] leading-[1.26]'
  },
  // The Deck's side panel: the Lyrics page's type, one step smaller to fit the column beside the turntable.
  panel: {
    s: 'text-[clamp(1.3rem,1.75vw,2.375rem)] leading-[1.3]',
    m: 'text-[clamp(1.5rem,2.05vw,2.875rem)] leading-[1.27]',
    l: 'text-[clamp(1.75rem,2.45vw,3.375rem)] leading-[1.24]'
  },
  compact: {
    s: 'text-[clamp(1.15rem,1.7vw,1.6rem)] leading-[1.3]',
    m: 'text-[clamp(1.4rem,2.2vw,2.05rem)] leading-[1.25]',
    l: 'text-[clamp(1.65rem,2.7vw,2.5rem)] leading-[1.22]'
  }
} as const

interface LyricRowProps {
  line: LyricLine
  index: number
  /** 0 = the line being sung, 1 and 2 = its neighbours, 3 = everything further away. */
  distance: 0 | 1 | 2 | 3
  /** Already sung: dimmer than the lines still to come. */
  past: boolean
  textClass: string
  seekable: boolean
  onLineClick: (time: number) => void
  saved: boolean
  onToggleSave: (text: string) => void
  saveLabel: string
  panel: boolean
}

// Lines still to come stay readable; lines already sung step back further.
const ROW_OPACITY = {
  large: {
    next: ['opacity-100', 'opacity-[0.42]', 'opacity-[0.28]', 'opacity-[0.2]'],
    past: ['opacity-100', 'opacity-[0.26]', 'opacity-[0.18]', 'opacity-[0.12]']
  }
} as const

const LyricRow = memo(
  ({
    line,
    index,
    distance,
    past,
    textClass,
    seekable,
    onLineClick,
    saved,
    onToggleSave,
    saveLabel,
    panel
  }: LyricRowProps): React.JSX.Element => {
    const lineRef = useRef<HTMLParagraphElement>(null)
    const isActive = distance === 0

    // Word-by-word fill on the active line only, and only when the lyrics carry real word
    // timings (enhanced LRC); plain lines light whole at their timestamp. Only this row's spans
    // are written, and only when a word's percentage changes, so the rest of the list never
    // repaints. Reduced motion lights the whole line at once.
    useEffect(() => {
      const el = lineRef.current
      const tokens = line.tokens
      if (!isActive || !el || !tokens) return

      const spans = Array.from(el.querySelectorAll<HTMLElement>('.lyric-word'))
      const words = tokens.filter((t) => !t.isWhitespace)

      if (prefersReducedMotion()) {
        spans.forEach((span) => span.style.setProperty('--word-progress', '100%'))
        return
      }

      const written = new Int16Array(words.length).fill(-1)
      let lastTime = -1

      return PlaybackClock.subscribe((clock) => {
        const time = clock + WORD_LEAD_SECONDS
        // A jump (seek) may move the fill backwards; ordinary playback never does.
        const jumped = Math.abs(time - lastTime) > 0.5
        lastTime = time

        for (let i = 0; i < words.length; i++) {
          const span = spans[i]
          if (!span) continue
          const { startTime, endTime } = words[i]
          let percent = 0
          if (time >= endTime) percent = 100
          else if (time > startTime)
            percent = Math.round(((time - startTime) / (endTime - startTime)) * 100)

          if (!jumped && percent < written[i]) continue
          if (percent === written[i]) continue
          written[i] = percent
          span.style.setProperty('--word-progress', `${percent}%`)
        }
      })
    }, [isActive, line.tokens])

    return (
      <div
        data-lyric-idx={index}
        onClick={() => onLineClick(line.time)}
        className={cn(
          'group relative rounded-xl pl-3.5 pr-9 origin-left',
          'py-1.5',
          // A short, calm change when a line becomes the sung one: it never trails the music.
          'transition-[opacity,transform] duration-[250ms] ease-primary motion-reduce:transition-none',
          // The same falloff and settle as the Lyrics page, so the two read as one design.
          ROW_OPACITY.large[past ? 'past' : 'next'][distance],
          // On the Lyrics page each line is as wide as its words (same wrapping and height, so
          // scrolling is measured the same), which keeps the save mark beside the words.
          panel ? 'w-full' : 'w-fit max-w-full',
          isActive ? 'cursor-default scale-100' : 'scale-[0.97]',
          !isActive && (seekable ? 'cursor-pointer hover:opacity-70' : 'cursor-default')
        )}
      >
        <p
          ref={lineRef}
          className={cn(
            'py-1 tracking-[-0.015em] text-ink text-pretty',
            panel && 'break-words',
            textClass,
            // One weight for every line: a bolder sung line used to be wider, so a line could
            // rewrap the moment it lit and push the lines below it. Light and size carry the focus.
            'font-semibold'
          )}
        >
          {line.tokens
            ? line.tokens.map((token, i) =>
                token.isWhitespace ? (
                  ' '
                ) : (
                  <span
                    key={i}
                    className={cn(
                      'lyric-word inline-block pb-[0.1em]',
                      isActive && 'lyric-word-active'
                    )}
                  >
                    {token.text}
                  </span>
                )
              )
            : line.text}
        </p>

        {line.text.trim() && (
          <button
            type="button"
            aria-label={saveLabel}
            aria-pressed={saved}
            title={saveLabel}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(line.text)
            }}
            className={cn(
              'absolute top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-[opacity,background-color,color] duration-micro hover:bg-ink/[0.08] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone',
              panel ? 'right-0' : '-right-1',
              // Shown on hover or keyboard focus only, so the lines stay clean.
              saved ? 'text-tone opacity-90' : 'text-dim opacity-0 group-hover:opacity-80'
            )}
          >
            <Bookmark className={cn('h-4 w-4 shrink-0', saved && 'fill-current')} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}

        {!isActive && seekable && (
          <Play
            aria-hidden="true"
            className="pointer-events-none absolute -left-3 top-1/2 h-3 w-3 -translate-y-1/2 fill-current text-tone opacity-0 transition-opacity duration-micro group-hover:opacity-80"
          />
        )}
      </div>
    )
  }
)

LyricRow.displayName = 'LyricRow'

export interface SyncedLyricsProps {
  className?: string
  lyricsSource?: string | null
  isLargeView?: boolean
  /** 'panel': the narrow card beside the Deck's turntable. */
  variant?: 'panel'
  /** A quiet now-playing line at the start of the toolbar. */
  header?: React.ReactNode
  /** Shows a close button at the end of the toolbar. */
  onClose?: () => void
  closeLabel?: string
}

export const SyncedLyrics = memo(
  ({ className, lyricsSource, isLargeView = false, variant, header, onClose, closeLabel }: SyncedLyricsProps): React.JSX.Element => {
    const title = usePlayerStore((s) => s.currentTrack?.title)
    const artist = usePlayerStore((s) => s.currentTrack?.artist)
    const album = usePlayerStore((s) => s.currentTrack?.album)
    const sourceAppId = usePlayerStore((s) => s.currentTrack?.sourceAppId)
    const canSeek = usePlayerStore((s) => s.currentTrack?.canSeek !== false)
    const duration = usePlayerStore((s) => Math.round(s.currentTrack?.duration ?? 0))
    const t = useT()
    const savedLines = useSavedLinesStore((s) => s.lines)
    const savedIds = useMemo(() => new Set(savedLines.map((l) => l.id)), [savedLines])
    const toggleSave = useCallback(
      (text: string) => {
        const kept = useSavedLinesStore
          .getState()
          .toggle({ text, title: title ?? '', artist: artist ?? '', album: album ?? '' })
        if (kept) {
          useNoticeStore.getState().show({
            id: `line-${Date.now()}`,
            title: t('lyrics.kept'),
            body: `“${text.trim()}”`,
            duration: 4500
          })
        }
      },
      [title, artist, album, t]
    )
    const seek = usePlayerStore((s) => s.seek)
    const lyricsOffset = usePlayerStore((s) => s.lyricsOffset)
    const setLyricsOffset = usePlayerStore((s) => s.setLyricsOffset)
    const autoScroll = usePlayerStore((s) => s.autoScrollLyrics)
    const lyricsSize = usePlayerStore((s) => s.lyricsSize)
    const lyricsFace = usePlayerStore((s) => s.lyricsFace)

    const [syncedSource, setSyncedSource] = useState<string | null>(null)
    const [plainLines, setPlainLines] = useState<string[]>([])
    const [status, setStatus] = useState<LyricsStatus>('loading')
    const [userIsScrolling, setUserIsScrolling] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [interludeBefore, setInterludeBefore] = useState(-1)
    /** Bumped to look the current track up again ("Try again", or the automatic retry). */
    const [lookupRound, setLookupRound] = useState(0)
    const autoRetriedRef = useRef(0)
    const [recoveryOpen, setRecoveryOpen] = useState(false)
    // The screensaver and the Listening Display are for looking, not fixing: no options there.
    const quietSurface = usePlayerStore((s) => s.isScreensaver || s.isListeningDisplay)

    const containerRef = useRef<HTMLDivElement>(null)
    const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const scrollAnimRef = useRef<number | null>(null)

    const hasTrack = Boolean(title) && sourceAppId !== 'kissa-idle'
    const trackKey = hasTrack ? `${title}\u0000${artist}\u0000${album}` : ''

    useEffect(() => {
      setSyncedSource(null)
      setPlainLines([])
      setActiveIndex(-1)
      setInterludeBefore(-1)
      setStatus(trackKey ? 'loading' : 'waiting')
      setLookupRound(0)
      autoRetriedRef.current = 0
      setRecoveryOpen(false)
      if (containerRef.current) containerRef.current.scrollTop = 0
    }, [trackKey])

    // Look the lyrics up
    // Timed lyrics are matched on the track's length, and a source often reports the
    // previous track's length (or none) for a moment after a track change. So wait for
    // the length to settle, and ask again if it changes afterwards.
    useEffect(() => {
      if (!trackKey) return

      if (lyricsSource) {
        setSyncedSource(lyricsSource)
        setStatus('synced')
        return
      }

      if (!window.electron?.getLyrics) {
        setStatus('unavailable')
        return
      }

      let cancelled = false
      if (lookupRound > 0) {
        setStatus((s) => (s === 'unavailable' || s === 'unreachable' ? 'loading' : s))
      }
      const timer = setTimeout(() => {
        window.electron
          .getLyrics({
            title: title ?? '',
            artist: artist ?? '',
            album: album ?? '',
            duration,
            force: lookupRound > 0
          })
          .then((res) => {
            if (cancelled) return

            // The lyrics service may know the track's length when the source does not.
            if (res?.duration && res.duration > 0) {
              const storeTrack = usePlayerStore.getState().currentTrack
              if (storeTrack && !storeTrack.duration) {
                usePlayerStore.setState((s) => ({
                  currentTrack: s.currentTrack
                    ? { ...s.currentTrack, duration: res.duration! }
                    : null
                }))
              }
            }

            if (res?.syncedLyrics) {
              setSyncedSource(res.syncedLyrics)
              setPlainLines([])
              setStatus('synced')
            } else if (res?.plainLyrics?.trim()) {
              // Words without timestamps are shown as text to read. Inventing timings
              // for them would highlight lines that are not being sung.
              setSyncedSource(null)
              setPlainLines(res.plainLyrics.split('\n').map((l) => l.trim()))
              setStatus('plain')
            } else if (res?.instrumental) {
              setSyncedSource(null)
              setStatus('instrumental')
            } else if (res?.status === 'unavailable') {
              // Keep anything already showing for this track; only say so when there is nothing.
              setStatus((s) => (s === 'synced' || s === 'plain' ? s : 'unreachable'))
            } else {
              setSyncedSource(null)
              setStatus('unavailable')
            }
          })
          .catch(() => {
            if (!cancelled) setStatus((s) => (s === 'synced' || s === 'plain' ? s : 'unreachable'))
          })
      }, LOOKUP_SETTLE_MS)

      return (): void => {
        cancelled = true
        clearTimeout(timer)
      }
      // title/artist/album are folded into trackKey.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackKey, duration, lyricsSource, lookupRound])

    // The library could not be reached (offline, busy): try once more by itself.
    useEffect(() => {
      if (status !== 'unreachable' || autoRetriedRef.current >= AUTO_RETRY_MS.length) return
      const wait = AUTO_RETRY_MS[autoRetriedRef.current]
      const timer = setTimeout(() => {
        autoRetriedRef.current += 1
        setLookupRound((n) => n + 1)
      }, wait)
      return (): void => clearTimeout(timer)
    }, [status])

    const retryLookup = useCallback((): void => {
      autoRetriedRef.current = AUTO_RETRY_MS.length
      setLookupRound((n) => n + 1)
    }, [])

    const lyricLines = useMemo(
      () => (syncedSource ? parseLrc(syncedSource, lyricsOffset || 0) : []),
      [syncedSource, lyricsOffset]
    )

    // Which line is being sung
    // The clock is read every frame, but React only hears about it when the line changes.
    useEffect(() => {
      if (lyricLines.length === 0) {
        setActiveIndex(-1)
        setInterludeBefore(-1)
        return
      }

      const locate = (time: number): [number, number] => {
        const lines = lyricLines
        if (time < lines[0].time - LEAD_IN_SECONDS) {
          return [-1, lines[0].time - time > INTERLUDE_SECONDS ? 0 : -1]
        }
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i]
          if (time < line.time - LEAD_IN_SECONDS) continue
          const next = lines[i + 1]
          const lineEnd = line.endTime ?? line.time + 6
          // Line finished and the next one is some way off: an instrumental break.
          if (next && next.time - lineEnd > 2.5 && time > lineEnd + 0.4) {
            return [
              -1,
              next.time - time > 1 && next.time - lineEnd > INTERLUDE_SECONDS ? i + 1 : -1
            ]
          }
          return [i, -1]
        }
        return [-1, -1]
      }

      let lastActive = -2
      let lastInterlude = -2
      return PlaybackClock.subscribe((time) => {
        const [active, interlude] = locate(time)
        if (active !== lastActive) {
          lastActive = active
          setActiveIndex(active)
          // Dev-only timing log: localStorage.kissa_debug_lyrics = '1'.
          if (import.meta.env.DEV && active >= 0 && localStorage.getItem('kissa_debug_lyrics') === '1') {
            const report = PlaybackClock.lastReport
            console.debug('[lyrics timing]', {
              line: active,
              lineStart: lyricLines[active].time,
              clock: Number(time.toFixed(3)),
              lastReport: report && Number(report.position.toFixed(3)),
              reportAgeMs: report && Math.round(performance.now() - report.at),
              wall: Date.now()
            })
          }
        }
        if (interlude !== lastInterlude) {
          lastInterlude = interlude
          setInterludeBefore(interlude)
        }
      })
    }, [lyricLines])

    const smoothScrollTo = useCallback((targetTop: number) => {
      const container = containerRef.current
      if (!container) return
      const startTop = container.scrollTop
      const distance = targetTop - startTop
      if (Math.abs(distance) < 1.5) return

      if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null

      // A long way (a seek across the song) or reduced motion: go straight there.
      const reduced = prefersReducedMotion()
      if (reduced || Math.abs(distance) > container.clientHeight * 1.5) {
        container.scrollTop = targetTop
        return
      }

      const startTime = performance.now()
      const length = Math.min(700, Math.max(380, Math.abs(distance) * 1.5))
      const step = (now: number): void => {
        const p = Math.min(1, (now - startTime) / length)
        container.scrollTop = startTop + distance * (1 - Math.pow(1 - p, 4))
        scrollAnimRef.current = p < 1 ? requestAnimationFrame(step) : null
      }
      scrollAnimRef.current = requestAnimationFrame(step)
    }, [])

    useEffect(() => {
      const container = containerRef.current
      const target = activeIndex >= 0 ? activeIndex : interludeBefore
      if (!autoScroll || userIsScrolling || target < 0 || !container) return
      const el = container.querySelector<HTMLElement>(`[data-lyric-idx="${target}"]`)
      if (!el) return

      const align = (): void => {
        const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
        smoothScrollTo(Math.max(0, top - container.clientHeight * 0.38 + el.clientHeight / 2))
      }
      align()
      if (variant !== 'panel') return
      // Re-centre after the header or lyric wrapping changes the reading area.
      const observer = new ResizeObserver(align)
      observer.observe(container)
      return () => observer.disconnect()
    }, [activeIndex, interludeBefore, autoScroll, userIsScrolling, smoothScrollTo, variant])

    useEffect(
      () => () => {
        if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current)
        if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current)
      },
      []
    )

    const handleUserScroll = (): void => {
      if (status !== 'synced') return
      if (scrollAnimRef.current !== null) cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null
      setUserIsScrolling(true)
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current)
      userScrollTimeoutRef.current = setTimeout(() => setUserIsScrolling(false), 4000)
    }

    const handleLineClick = useCallback(
      (time: number): void => {
        if (usePlayerStore.getState().currentTrack?.canSeek === false) return
        seek(time)
        const state = usePlayerStore.getState()
        if (!state.isPlaying) {
          state.play()
          if (state.currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
            window.__kissaMediaCommandCooldown?.()
            void window.electron.mediaPlayPause()
          }
        }
        setUserIsScrolling(false)
      },
      [seek]
    )

    const nudge = (delta: number): void =>
      setLyricsOffset(Math.max(-2, Math.min(2, Math.round((lyricsOffset + delta) * 10) / 10)))

    const textClass = cn(
      SIZE_CLASSES[isLargeView ? 'large' : variant === 'panel' ? 'panel' : 'compact'][lyricsSize],
      lyricsFace === 'serif' ? 'font-kissa-editorial tracking-[-0.005em]' : 'font-kissa-lyrics'
    )

    return (
      <div
        className={cn(
          'group/lyrics relative flex h-full w-full flex-col overflow-hidden select-none',
          variant === 'panel' && 'absolute inset-0 h-auto',
          className
        )}
      >
        {(header || onClose || (hasTrack && !quietSurface)) && (
          <div
            className={cn(
              'flex shrink-0 gap-1',
              // The panel's header is quiet: its controls brighten on hover or keyboard focus.
              variant === 'panel'
                ? 'items-start pb-7 [&>button]:opacity-60 [&>button:hover]:opacity-100 [&>button:focus-visible]:opacity-100 [&>*:not(:first-child)]:transition-opacity'
                : 'items-center justify-start px-6 pt-3 min-[900px]:px-10'
            )}
          >
            {header && <div className="min-w-0 flex-1">{header}</div>}
            {hasTrack && !quietSurface && (
              <LyricsMenu
                onChoose={
                  !lyricsSource && typeof window.electron?.chooseLyrics === 'function'
                    ? () => setRecoveryOpen(true)
                    : undefined
                }
                timed={status === 'synced'}
                offset={lyricsOffset}
                onNudge={nudge}
                onReset={() => setLyricsOffset(0)}
              />
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.07] hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {recoveryOpen && (
          <LyricsRecovery
            key={`${trackKey}:${duration}`}
            request={{ title: title ?? '', artist: artist ?? '', album: album ?? '', duration }}
            onClose={() => setRecoveryOpen(false)}
            onSaved={() => {
              setRecoveryOpen(false)
              setLyricsOffset(0)
              setSyncedSource(null)
              setPlainLines([])
              setLookupRound((n) => n + 1)
              setStatus('loading')
            }}
          />
        )}
        {userIsScrolling && status === 'synced' && (
          <button
            type="button"
            onClick={() => setUserIsScrolling(false)}
            className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 rounded-full border border-panel-line bg-[var(--panel-bg)] px-3.5 py-1.5 text-[12.5px] font-medium text-tone shadow-[var(--panel-shadow)] transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
          >
            <LocateFixed className="h-3 w-3" aria-hidden="true" />
            <span>{t('lyrics.currentLine')}</span>
          </button>
        )}

        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className={cn(
            'no-scrollbar relative min-h-0 flex-1 overflow-y-auto',
            variant === 'panel' ? 'py-6' : 'px-6 py-12 min-[900px]:px-10'
          )}
          style={
            // A softer, longer feather in the shorter panel, so no line is ever cut mid-glyph.
            variant === 'panel'
              ? {
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
                }
              : {
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)'
                }
          }
        >
          {status === 'synced' && lyricLines.length > 0 && (
            <div className={cn('py-[40vh]', variant === 'panel' ? 'space-y-2 min-[1500px]:space-y-3' : 'space-y-3 min-[900px]:space-y-4')}>
              {lyricLines.map((line, index) => (
                <React.Fragment key={line.id}>
                  {index === interludeBefore && (
                    <div
                      className="flex h-8 items-center gap-2 px-3.5"
                      aria-label={t('lyrics.instrumental')}
                      role="img"
                    >
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-2 w-2 rounded-full bg-ink opacity-50 motion-safe:animate-pulse"
                          style={{ animationDelay: `${dot * 220}ms` }}
                        />
                      ))}
                    </div>
                  )}
                  <LyricRow
                    panel={variant === 'panel'}
                    line={line}
                    index={index}
                    distance={
                      activeIndex < 0
                        ? 2
                        : (Math.min(3, Math.abs(index - activeIndex)) as 0 | 1 | 2 | 3)
                    }
                    past={activeIndex >= 0 && index < activeIndex}
                    textClass={textClass}
                    seekable={canSeek}
                    onLineClick={handleLineClick}
                    saved={savedIds.has(savedLineId(title ?? '', artist ?? '', line.text))}
                    onToggleSave={toggleSave}
                    saveLabel={t('lyrics.keep')}
                  />
                </React.Fragment>
              ))}
            </div>
          )}

          {status === 'plain' && (
            <div className="py-10">
              <p className="mb-8 px-3.5 text-[12.5px] text-dim">
                {t('lyrics.notTimed')}
              </p>
              <div className="space-y-3">
                {plainLines.map((text, i) =>
                  text ? (
                    <p
                      key={i}
                      className={cn(
                        'px-3.5 text-pretty text-ink opacity-80',
                        SIZE_CLASSES.compact[lyricsSize],
                        lyricsFace === 'serif' ? 'font-kissa-editorial' : 'font-kissa-lyrics'
                      )}
                    >
                      {text}
                    </p>
                  ) : (
                    <div key={i} className="h-5" />
                  )
                )}
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="h-5 w-5 rounded-full border-2 border-tone/30 border-t-tone motion-safe:animate-spin" />
              <p className="text-[13px] text-dim">
                {t('lyrics.finding')}
              </p>
            </div>
          )}

          {status === 'instrumental' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
              <p className="font-serif text-2xl text-ink opacity-90">{t('lyrics.instrumental')}</p>
              <p className="text-xs text-dim">{t('lyrics.instrumental.body')}</p>
            </div>
          )}

          {status === 'unavailable' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
              <p className="font-serif text-2xl text-ink opacity-80">{t('lyrics.none')}</p>
              <p className="max-w-xs text-xs text-dim">
                {title ? t('lyrics.none.body', { title }) : t('lyrics.none.bodyNoTitle')}
              </p>
              <button type="button" onClick={retryLookup} className={RETRY_BUTTON_CLASS}>
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                <span>{t('lyrics.searchAgain')}</span>
              </button>
            </div>
          )}

          {status === 'unreachable' && (
            <div
              className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center"
              role="status"
            >
              <p className="font-serif text-2xl text-ink opacity-80">{t('lyrics.unreachable')}</p>
              <p className="max-w-xs text-xs text-dim">
                {t('lyrics.unreachable.body')}
              </p>
              <button type="button" onClick={retryLookup} className={RETRY_BUTTON_CLASS}>
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                <span>{t('lyrics.tryNow')}</span>
              </button>
            </div>
          )}

          {status === 'waiting' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
              <Quote
                className="mb-2 h-8 w-8 text-tone opacity-40 min-[900px]:h-10 min-[900px]:w-10"
                aria-hidden="true"
              />
              <p className="font-serif text-2xl text-ink opacity-90 min-[900px]:text-3xl">
                {t('lyrics.waiting')}
              </p>
              <p className="max-w-sm text-sm text-dim">
                {t('lyrics.waiting.body')}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }
)

SyncedLyrics.displayName = 'SyncedLyrics'
