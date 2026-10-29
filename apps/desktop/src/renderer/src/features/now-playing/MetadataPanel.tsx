import { memo, useState } from 'react'
import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion'
import { RotateCcw, Share2 } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { HiFiVisualizer } from '@renderer/components/ui/HiFiVisualizer'
import { ShareTrackModal } from '@renderer/features/share/ShareTrackModal'
import { SideMeter } from '@renderer/features/sides/SideMeter'
import { SleeveBack } from '@renderer/features/sides/SleeveBack'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { TracklistButton, TracklistCard } from '@renderer/features/sides/Tracklist'
import { AlbumOpenButton, AlbumResumeButton } from '@renderer/features/album/AlbumEntry'
import { UpNextButton } from '@renderer/features/remote/UpNext'
import { VinylSoundButton } from '@renderer/features/hifi/VinylSoundButton'
import { useT, tl } from '@renderer/i18n'
import { greetingFor } from '@renderer/utils/greeting'

/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * The full text as a hover tooltip only when the line is actually cut short. A tooltip on text
 * that is already fully visible just floats a stray box over the room.
 */
function titleIfClipped(e: { currentTarget: HTMLElement }): void {
  const el = e.currentTarget
  const clipped = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
  if (clipped) el.title = el.textContent ?? ''
  else el.removeAttribute('title')
}

/** Turning the sleeve over: it lifts a little off the room as it turns, and settles. */
const SLEEVE_TRANSITION: Transition = {
  rotateY: { duration: 0.8, ease: [0.65, 0, 0.3, 1] },
  scale: { duration: 0.8, times: [0, 0.5, 1], ease: 'easeInOut' }
}
const SLEEVE_TURN: Variants = {
  front: { rotateY: 0, scale: [1, 0.94, 1], transition: SLEEVE_TRANSITION },
  back: { rotateY: 180, scale: [1, 0.94, 1], transition: SLEEVE_TRANSITION }
}

export interface MetadataPanelProps {
  className?: string
  /** Narrow window: the words sit under the turntable, so the cover card is left out (the record label already shows it). */
  compact?: boolean
  /** Party mode on a TV: no outer padding (the stage sets the margins), a cover sized to the screen height, no small buttons. */
  stage?: boolean
}

/**
 * The sleeve notes beside the deck: what is playing, who by, and its cover.
 * Time and transport live in the dock, so nothing here repeats them.
 */
export const MetadataPanel = memo(({ className, compact = false, stage = false }: MetadataPanelProps) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const turned = useSidesStore((s) => s.sleeveTurned)
  const setTurned = (next: boolean | ((v: boolean) => boolean)): void =>
    useSidesStore.setState((s) => ({
      sleeveTurned: typeof next === 'function' ? next(s.sleeveTurned) : next
    }))
  // The back is printed the first time the sleeve is turned, and kept for the turn back.
  const [backPrinted, setBackPrinted] = useState(false)
  if (turned && !backPrinted) setBackPrinted(true)
  const t = useT()

  const isIdle = !currentTrack || currentTrack.sourceAppId === 'kissa-idle'
  const artworkUrl = currentTrack?.artworkUrl ?? albumPlaceholder
  const title = currentTrack?.title?.trim() || '—'
  const artist = currentTrack?.artist?.trim() || '—'
  const album = currentTrack?.album?.trim() || ''
  const duration = currentTrack?.duration ?? 0
  const showAlbum = !isIdle && album && album.toLowerCase() !== title.toLowerCase()
  // A short id for the picture itself, so a sharper copy of the cover arriving later crossfades in
  // instead of swapping in place.
  const artKey = `${artworkUrl.length}:${artworkUrl.slice(-24)}`

  const cover = (
    <div
      className={cn(
        // Sized to the window's height too, so a two-line title never makes the column taller than the deck.
        'relative w-full max-w-[min(250px,80%,30vh)] min-[1200px]:max-w-[min(290px,32vh)]',
        stage && 'max-w-[min(340px,32vh,80%)] min-[1200px]:max-w-[min(340px,32vh)]',
        compact && 'hidden'
      )}
    >
      {/* The cover's own colours as the light it casts on the room beneath it. */}
      <AnimatePresence initial={false}>
        <motion.img
          key={isIdle ? 'idle-glow' : `${title}|${artist}|${artKey}|glow`}
          aria-hidden="true"
          src={artworkUrl}
          alt=""
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0, transition: { duration: 0.6, delay: 0.2 } }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-x-[8%] top-[14%] -bottom-[6%] h-[92%] w-[84%] rounded-[24px] object-cover blur-[34px] saturate-[1.6]"
        />
      </AnimatePresence>
      {/* Click the cover to turn the sleeve over: the track list is printed on the back. */}
      <div
        role="button"
        tabIndex={isIdle ? -1 : 0}
        aria-pressed={turned}
        aria-label={turned ? t('sleeve.front') : t('sleeve.back')}
        data-testid="sleeve"
        onClick={() => !isIdle && setTurned((v) => !v)}
        onKeyDown={(e) => {
          if (isIdle) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setTurned((v) => !v)
          } else if (e.key === 'Escape') setTurned(false)
        }}
        className={cn(
          'group/sleeve relative aspect-square w-full rounded-[14px] [perspective:1400px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-tone',
          !isIdle && 'cursor-pointer'
        )}
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          initial={false}
          variants={SLEEVE_TURN}
          animate={turned && !isIdle ? 'back' : 'front'}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[14px] bg-[var(--panel-bg)] shadow-[0_28px_56px_-22px_rgba(0,0,0,0.75),0_10px_22px_-12px_rgba(0,0,0,0.55)] [backface-visibility:hidden]">
            <AnimatePresence initial={false}>
              <motion.img
                key={isIdle ? 'idle-cover' : `${title}|${artist}|${artKey}`}
                // The new cover settles in over the old one a beat after the title starts to
                // change; the old one leaves only once it is covered, so the sleeve is never empty.
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.3 } }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                src={artworkUrl}
                alt={isIdle ? '' : `Cover of ${album || title} by ${artist}`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = albumPlaceholder
                }}
              />
            </AnimatePresence>
            {/* A hairline edge and a whisper of gloss, like a printed sleeve under a lamp. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.16)] bg-[linear-gradient(155deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_38%)]"
            />
            {!isIdle && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-black/45 pl-2 pr-2.5 text-[11.5px] font-medium text-white/90 opacity-0 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18)] backdrop-blur-md transition-opacity duration-200 group-hover/sleeve:opacity-100 group-focus-visible/sleeve:opacity-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('sleeve.turn')}
              </span>
            )}
          </div>
          <div
            className="absolute inset-0 rounded-[14px] shadow-[0_28px_56px_-22px_rgba(0,0,0,0.75),0_10px_22px_-12px_rgba(0,0,0,0.55)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!turned}
          >
            {!isIdle && backPrinted && (
              <SleeveBack
                artworkUrl={artworkUrl}
                album={album || title}
                artist={artist}
                shown={turned}
                hasAlbum={Boolean(album)}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )

  const status = isIdle ? 'The room is quiet' : isPlaying ? 'Now playing' : 'Paused'

  return (
    <section
      className={cn(
        'flex w-full flex-col items-start select-none',
        compact
          ? 'px-6 pt-3 pb-4'
          : stage
            ? 'p-0'
            : // Even top and bottom, so the words centre on the same line as the deck beside them.
              'px-4 py-4 min-[800px]:px-6 min-[800px]:py-6 min-[1200px]:pl-10 min-[1200px]:pr-6',
        className
      )}
    >
      <div
        className="flex w-full flex-col items-start transition-opacity duration-75"
        style={{ opacity: 'calc(0.4 + 0.6 * var(--room-illumination, 1))' }}
      >
        {cover}

        {/* Where the music is coming from, as one small glass pill. */}
        <div
          className={cn(
            'inline-flex h-[26px] max-w-full items-center gap-2 rounded-full bg-white/[0.07] pl-2.5 pr-3 text-[11.5px] font-medium tracking-[-0.005em] text-ink/80 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.2)] backdrop-blur-md',
            compact ? 'mt-0' : 'mt-8 min-[1200px]:mt-9'
          )}
        >
          {isIdle ? (
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink/40" />
          ) : (
            <HiFiVisualizer isPlaying={isPlaying} barsCount={4} height={9} showPeaks={false} />
          )}
          <span className="text-ink/90">{status}</span>
          {!isIdle && currentTrack?.source && (
            <>
              <span aria-hidden="true" className="text-ink/30">
                ·
              </span>
              <span className="truncate text-dim">{currentTrack.source}</span>
            </>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isIdle ? 'idle' : `${title}|${artist}`}
            // Out quickly, in gently: the words lead the change, the cover and record follow.
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            className="w-full"
          >
            {isIdle ? (
              <>
                <h1
                  className={cn(
                    'mt-3 font-kissa-editorial font-medium tracking-[-0.03em] text-ink text-balance',
                    compact ? 'text-[1.6rem] leading-[1.06]' : 'text-[clamp(1.7rem,2.6vw,3rem)] leading-[1.06]'
                  )}
                >
                  {greetingFor(new Date(), listenerName)}
                </h1>
                <p className="mt-3 max-w-[32ch] text-[13.5px] leading-relaxed text-dim">
                  {t('deck.idleHint')}
                </p>
                <div
                  className={cn('flex flex-wrap items-center gap-2.5', compact ? 'mt-3' : 'mt-5')}
                >
                  <AlbumOpenButton />
                  <AlbumResumeButton />
                </div>
              </>
            ) : (
              <>
                {/*
                  Room for two lines whatever the title, so the cover above never shifts between
                  songs. A one-line title sits at the bottom of that room, next to the artist.
                */}
                <div
                  className={cn(
                    !compact &&
                      'flex min-h-[calc(0.75rem+2*1.04em)] flex-col justify-end text-[clamp(1.75rem,2.7vw,3.15rem)]'
                  )}
                >
                <h1
                  className={cn(
                    'mt-[calc(0.75rem-0.14em)] pt-[0.14em] font-kissa-editorial font-medium tracking-[-0.03em] text-ink line-clamp-2 text-balance',
                    // The line height comes after the size: tailwind-merge drops a leading set before a text size.
                    compact ? 'text-[1.6rem] leading-[1.04]' : 'text-[clamp(1.75rem,2.7vw,3.15rem)] leading-[1.04]'
                  )}
                  style={{ textShadow: '0 1px 1px rgba(0,0,0,0.25), 0 8px 30px rgba(0,0,0,0.25)' }}
                  onMouseEnter={titleIfClipped}
                >
                  {title}
                </h1>
                </div>
                <p
                  className="mt-2 text-[17px] font-medium leading-snug tracking-[-0.012em] text-ink/85 line-clamp-1"
                  onMouseEnter={titleIfClipped}
                >
                  {artist}
                </p>
                {/* Its line is kept even when empty, so the column keeps its height between songs. */}
                <p
                  className={cn(
                    'mt-0.5 text-[14px] leading-snug tracking-[-0.006em] text-dim line-clamp-1',
                    !showAlbum && 'invisible'
                  )}
                  aria-hidden={!showAlbum || undefined}
                  onMouseEnter={titleIfClipped}
                >
                  {showAlbum ? album : ' '}
                </p>

                <div
                  className={cn(
                    'flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-dim',
                    compact ? 'mt-2.5' : 'mt-4',
                    stage && 'hidden'
                  )}
                >
                  {duration > 0 && <span className="tabular-nums">{formatTime(duration)}</span>}
                  <button
                    type="button"
                    onClick={() => setIsShareOpen(true)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 -ml-1 text-dim transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone active:scale-[0.97]"
                    title={tl('a11y.share')}
                    aria-label={tl('a11y.share')}
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[12px]">Share</span>
                  </button>
                  <TracklistButton />
                  <UpNextButton />
                  <VinylSoundButton />
                </div>
                <div className="mt-2 empty:hidden">
                  <AlbumResumeButton />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Outside the per-track animation, so it stays put across a track change. */}
        {!compact && !isIdle && <SideMeter className="mt-7 hidden min-[720px]:block" />}
      </div>

      {compact && !isIdle && (
        <TracklistCard
          artworkUrl={artworkUrl}
          album={album || title}
          artist={artist}
          hasAlbum={Boolean(album)}
        />
      )}

      <ShareTrackModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        track={currentTrack}
      />
    </section>
  )
})

MetadataPanel.displayName = 'MetadataPanel'
