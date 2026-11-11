import { memo, useState } from 'react'
import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion'
import { RotateCcw, Share2 } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { SoundBars } from './SoundBars'
import { ICON_ACTION } from '@renderer/components/ui/iconAction'
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

/** The column is the cover's width; everything below it lines up with its edges. */
const COLUMN_WIDTH = 'max-w-[min(260px,80%,30vh)] min-[1200px]:max-w-[min(300px,33vh)]'
/** A calm title: about 34 px at 1920, smaller with the window. */
const TITLE_SIZE = 'text-[clamp(1.5rem,1.8vw,2.125rem)]'

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
  const shouting = /[A-Z]/.test(title) && title === title.toUpperCase() && title.replace(/[^A-Za-z]/g, '').length > 3
  const showAlbum = !isIdle && album && album.toLowerCase() !== title.toLowerCase()
  // A short id for the picture itself, so a sharper copy of the cover arriving later crossfades in
  // instead of swapping in place.
  const artKey = `${artworkUrl.length}:${artworkUrl.slice(-24)}`

  const cover = (
    <div
      className={cn(
        // Sized to the window's height too, so a two-line title never makes the column taller than the deck.
        'relative w-full',
        // On the Party stage the cover grows with the screen, readable from across the room.
        stage && 'max-w-[min(clamp(240px,35vh,760px),100%)] min-[1200px]:max-w-[min(clamp(240px,35vh,760px),100%)]',
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
          'group/sleeve relative aspect-square w-full rounded-[14px] [perspective:1400px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tone',
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

  const source = currentTrack?.source?.trim()
  const sourceLine = isIdle
    ? t('deck.status.quiet')
    : source
      ? t(isPlaying ? 'np.playingFrom' : 'np.pausedIn', { source })
      : isPlaying
        ? t('lr.nowPlaying')
        : t('deck.status.paused')

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
        className={cn(
          'flex w-full flex-col items-start transition-opacity duration-75',
          // One column as wide as the cover: every line wraps or clamps inside it.
          !compact && !stage && COLUMN_WIDTH
        )}
        style={{ opacity: 'calc(0.4 + 0.6 * var(--room-illumination, 1))' }}
      >
        {cover}

        {/* Where the music is coming from: one quiet line, led by the sound itself. */}
        <div
          data-testid="np-source"
          className={cn(
            'flex max-w-full items-center gap-2.5 leading-5 text-dim',
            stage ? 'text-[clamp(13px,1.6vh,28px)]' : 'text-[13px]',
            compact ? 'mt-0' : 'mt-6'
          )}
        >
          {isIdle ? (
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ink/40" />
          ) : (
            <SoundBars playing={isPlaying} />
          )}
          <span className="truncate">{sourceLine}</span>
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
                  The title takes only the lines it needs, so a one-line title sits right under the
                  source line. (Reserving two lines kept the cover still between songs but left an
                  empty line above short titles; the column now shifts slightly when a title wraps.)
                */}
                <div
                  className={cn(
                    !compact && !stage && TITLE_SIZE
                  )}
                >
                <h1
                  className={cn(
                    'mt-[calc(1rem-0.14em)] pt-[0.14em] font-kissa-editorial font-medium tracking-[-0.03em] text-ink line-clamp-2 text-balance',
                    // The line height comes after the size: tailwind-merge drops a leading set before a text size.
                    compact
                      ? 'text-[1.6rem] leading-[1.04]'
                      : stage
                        ? 'text-[clamp(2rem,4vh,5.4rem)] leading-[1.04]'
                        : // A title set in capitals is a touch smaller and more open, so it does not shout.
                          // (The line height comes after the size, which tailwind-merge requires.)
                          cn(shouting ? 'text-[0.9em] tracking-[0.01em]' : TITLE_SIZE, 'leading-[1.08]')
                  )}
                  style={{ textShadow: '0 1px 1px rgba(0,0,0,0.25), 0 8px 30px rgba(0,0,0,0.25)' }}
                  onMouseEnter={titleIfClipped}
                >
                  {title}
                </h1>
                </div>
                {/* Who by, in full (two lines at most), then the album on its own quieter line. */}
                <p
                  className={cn(
                    'mt-2 line-clamp-2 font-medium leading-snug tracking-[-0.01em] text-ink/90',
                    stage ? 'text-[clamp(17px,2.4vh,44px)]' : 'text-[16px]'
                  )}
                  onMouseEnter={titleIfClipped}
                >
                  {artist}
                </p>
                {showAlbum && (
                  <p
                    className={cn(
                      'mt-0.5 truncate leading-snug tracking-[-0.006em] text-dim',
                      stage ? 'text-[clamp(14px,1.9vh,34px)]' : 'text-[14px]'
                    )}
                    onMouseEnter={titleIfClipped}
                  >
                    {album}
                  </p>
                )}                <div className="mt-2 empty:hidden">
                  <AlbumResumeButton />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/*
          One footer row, outside the per-track animation so it stays put across a track change:
          where on the side you are on the left, the record's actions as quiet icons on the right.
        */}
        {!isIdle && (
          <div
            className={cn(
              'flex w-full items-end gap-4',
              compact ? 'mt-3' : 'mt-5',
              stage && 'mt-[3vh]'
            )}
          >
            {!compact && <SideMeter stage={stage} className={cn('hidden min-w-0 min-[720px]:block', stage && 'w-full')} />}
            {!stage && (
              // Beside the side meter, at the right edge; with no side meter, at the left edge.
              <div className={cn('flex items-center gap-0.5', !compact && 'ml-auto -mr-2 first:ml-[-8px] first:mr-0')}>
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className={ICON_ACTION}
                  title={tl('a11y.share')}
                  aria-label={tl('a11y.share')}
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
                <TracklistButton iconOnly />
                <UpNextButton iconOnly />
                <VinylSoundButton iconOnly />
              </div>
            )}
          </div>
        )}      </div>

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
