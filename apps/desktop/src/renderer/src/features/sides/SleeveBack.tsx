import { memo, useEffect, useRef } from 'react'
import { useT, type MessageKey } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useSidesStore } from './sidesStore'
import { sideSourceKeys } from './sides'
import { AlbumTrackList, useAlbumOnDeck } from '@renderer/features/album/AlbumEntry'

function clock(ms: number): string {
  if (!(ms > 0)) return ''
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface SleeveBackProps {
  artworkUrl: string
  album: string
  artist: string
  /** True while this face is turned to the listener, so the song playing scrolls into view. */
  shown: boolean
  /** False when the track names no album, so there was nothing to look up. */
  hasAlbum?: boolean
}

/**
 * The back of the sleeve: the record's track list printed side by side, the way an LP lists
 * them, with the song playing picked out. The cover's own colours tint the card behind it.
 */
export const SleeveBack = memo(
  ({ artworkUrl, album, artist, shown, hasAlbum = true }: SleeveBackProps) => {
    const t = useT()
    const sides = useSidesStore((s) => s.sides)
    const place = useSidesStore((s) => s.place)
    const lookup = useSidesStore((s) => s.lookup)
    const isPlaying = usePlayerStore((s) => s.isPlaying)
    const listRef = useRef<HTMLDivElement>(null)
    // A record from the listener's own album folder: its files are the track list.
    const local = useAlbumOnDeck()
    const progress = usePlayerStore((s) => (local ? s.currentTrack?.audioUrl : null))

    useEffect(() => {
      if (!shown || !listRef.current) return
      const playing = listRef.current.querySelector<HTMLElement>('[data-playing="true"]')
      if (!playing) return
      const box = listRef.current
      const top = playing.offsetTop - box.clientHeight / 2 + playing.clientHeight / 2
      box.scrollTo?.({ top: Math.max(0, top), behavior: 'smooth' })
    }, [shown, place, progress])

    const source = sides ? sideSourceKeys(sides.kind) : null
    const emptyKey: MessageKey =
      lookup === 'off'
        ? 'sides.off'
        : !hasAlbum
          ? 'sides.noAlbum'
          : lookup === 'finding'
            ? 'sides.finding'
            : 'sides.noList'
    let number = 0
    return (
      <div
        className={cn(
          'absolute inset-0 overflow-hidden rounded-[14px] bg-[#16130f]',
          !isPlaying && 'sleeve-paused'
        )}
        data-testid="sleeve-back"
      >
        {/* The cover, washed out and blurred, as the colour of the card stock. */}
        <img
          src={artworkUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.32] blur-[28px] saturate-[1.4]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(14,12,10,0.55)_0%,rgba(14,12,10,0.82)_100%)]"
        />

        <div className="relative flex h-full flex-col px-4 pb-3 pt-3.5">
          <div className="min-w-0">
            <p className="truncate font-kissa-editorial text-[17px] font-medium leading-tight tracking-[-0.02em] text-ink">
              {album}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-ink/60">{artist}</p>
            {(source || local) && (
              <p
                className="mt-1.5 inline-flex h-[18px] items-center rounded-full bg-white/[0.08] px-2 text-[10.5px] font-medium text-ink/75 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]"
                data-testid="side-source"
                data-kind={local ? 'files' : sides?.kind}
              >
                {local ? t('album.source') : source && t(source.label)}
              </p>
            )}
          </div>

          {local ? (
            <div
              ref={listRef}
              className="relative mt-2.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar [mask-image:linear-gradient(180deg,transparent_0,black_10px,black_calc(100%-14px),transparent_100%)]"
            >
              <AlbumTrackList />
            </div>
          ) : sides ? (
            <div
              ref={listRef}
              className="relative mt-2.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar [mask-image:linear-gradient(180deg,transparent_0,black_10px,black_calc(100%-14px),transparent_100%)]"
            >
              {sides.sides.map((side, si) => {
                const total = side.tracks.reduce((a, tr) => a + (tr.length > 0 ? tr.length : 0), 0)
                return (
                  <div key={side.letter} className={si > 0 ? 'mt-2.5' : 'pt-1'}>
                    <div className="flex items-baseline justify-between border-b border-white/[0.09] pb-1">
                      <span className="text-[11px] font-semibold text-tone">
                        {t('sides.side', { letter: side.letter })}
                      </span>
                      {total > 0 && (
                        <span className="text-[10.5px] tabular-nums text-ink/40">
                          {clock(total)}
                        </span>
                      )}
                    </div>
                    <ol className="mt-1">
                      {side.tracks.map((tr, ti) => {
                        number++
                        const playing = place?.side === si && place.track === ti
                        return (
                          <li
                            key={ti}
                            data-playing={playing ? 'true' : undefined}
                            className={cn(
                              '-mx-1.5 flex items-baseline gap-2 rounded-[6px] px-1.5 py-[3px] text-[11.5px] leading-snug',
                              playing ? 'bg-white/[0.10] text-ink' : 'text-ink/75'
                            )}
                          >
                            <span
                              className={cn(
                                'w-4 shrink-0 text-right tabular-nums',
                                playing ? 'text-tone' : 'text-ink/35'
                              )}
                            >
                              {playing ? (
                                <span
                                  aria-label={t('sides.playing')}
                                  className="inline-flex h-[9px] items-end gap-[1.5px]"
                                >
                                  <i className="sleeve-eq block w-[2px] rounded-full bg-tone" />
                                  <i className="sleeve-eq block w-[2px] rounded-full bg-tone [animation-delay:-0.4s]" />
                                  <i className="sleeve-eq block w-[2px] rounded-full bg-tone [animation-delay:-0.7s]" />
                                </span>
                              ) : (
                                number
                              )}
                            </span>
                            <span
                              className={cn('min-w-0 flex-1 truncate', playing && 'font-medium')}
                            >
                              {tr.title}
                            </span>
                            <span className="shrink-0 tabular-nums text-ink/40">
                              {clock(tr.length)}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )
              })}
              {source && (
                <p className="mt-3 pb-1 text-[10.5px] leading-snug text-ink/45">{t(source.note)}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center">
              <p className="max-w-[24ch] text-[12px] leading-relaxed text-ink/55">{t(emptyKey)}</p>
            </div>
          )}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.16)]"
        />
      </div>
    )
  }
)

SleeveBack.displayName = 'SleeveBack'
