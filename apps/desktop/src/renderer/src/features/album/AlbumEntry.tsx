import { memo, type KeyboardEvent, type MouseEvent } from 'react'
import { FolderOpen, Play, RotateCcw, X } from 'lucide-react'
import { useT, type MessageKey } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { albumIndexOf, isAlbumUrl, useAlbumStore } from './albumStore'

function clock(seconds: number): string {
  if (!(seconds > 0)) return ''
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** True while the record on the deck is a track from the album folder. */
export function useAlbumOnDeck(): boolean {
  return usePlayerStore((s) => isAlbumUrl(s.currentTrack?.audioUrl))
}

/**
 * Put an album from the PC on the deck: one plainly labelled button, a reading state while
 * Windows reads the files, and a reason when a folder has nothing Kissa can play.
 */
export interface AlbumOpenButtonProps {
  /** Glass instead of the accent: for places where it is not the main thing to do. */
  quiet?: boolean
  /** The smaller size of a toolbar, with its notice shown as a card below it. */
  small?: boolean
  label?: MessageKey
}

export const AlbumOpenButton = memo(
  ({ quiet = false, small = false, label }: AlbumOpenButtonProps) => {
    const t = useT()
    const reading = useAlbumStore((s) => s.status === 'reading')
    const notice = useAlbumStore((s) => s.notice)
    const open = useAlbumStore((s) => s.open)
    const dismiss = useAlbumStore((s) => s.dismissNotice)

    return (
      <div className={cn('flex flex-col items-start gap-2', small && 'relative')}>
        <button
          type="button"
          data-testid="album-open"
          onClick={() => void open(t('album.source'))}
          disabled={reading}
          aria-busy={reading}
          className={cn(
            'inline-flex items-center gap-2 rounded-full font-medium transition-[background-color,transform,opacity] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone active:scale-[0.97] disabled:cursor-progress',
            small ? 'h-8 px-3.5 text-[12.5px]' : 'h-9 px-4 text-[13px]',
            quiet
              ? 'bg-white/[0.07] text-ink/85 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14)] hover:bg-white/[0.11]'
              : 'bg-tone text-[#14110e] shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110'
          )}
        >
          <FolderOpen
            className={cn('h-4 w-4', reading && 'motion-safe:animate-pulse')}
            aria-hidden="true"
          />
          <span>
            {reading ? t('album.reading') : t(label ?? (quiet ? 'album.another' : 'album.open'))}
          </span>
        </button>
        {notice && (
          <p
            role="status"
            data-testid="album-notice"
            className={cn(
              'flex max-w-[40ch] items-start gap-2 text-[12.5px] leading-relaxed text-ink/75',
              small &&
                'absolute right-0 top-full z-30 mt-2 w-[300px] rounded-[14px] bg-[#1b1714]/95 p-3 text-left shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.12)] backdrop-blur-xl'
            )}
          >
            <span>{t(notice === 'empty' ? 'album.empty' : 'album.error')}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('album.dismiss')}
              className="mt-0.5 rounded-full p-0.5 text-ink/50 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </p>
        )}
      </div>
    )
  }
)
AlbumOpenButton.displayName = 'AlbumOpenButton'

/** After another player took over: the way back to the album, where it was left. */
export const AlbumResumeButton = memo(() => {
  const t = useT()
  const resume = useAlbumStore((s) => s.resume)
  const title = useAlbumStore((s) => s.album?.title ?? '')
  const resumeAlbum = useAlbumStore((s) => s.resumeAlbum)
  const onDeck = useAlbumOnDeck()
  if (!resume || onDeck) return null
  return (
    <button
      type="button"
      data-testid="album-resume"
      onClick={resumeAlbum}
      className="inline-flex h-8 max-w-full items-center gap-2 rounded-full bg-white/[0.07] pl-2.5 pr-3.5 text-[12.5px] font-medium text-ink/85 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14)] transition-colors hover:bg-white/[0.11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone active:scale-[0.97]"
    >
      <RotateCcw className="h-3.5 w-3.5 shrink-0 text-tone" aria-hidden="true" />
      <span className="truncate">
        {title ? t('album.resumeNamed', { album: title }) : t('album.resume')}
      </span>
    </button>
  )
})
AlbumResumeButton.displayName = 'AlbumResumeButton'

const PROBLEM_KEYS: Record<string, MessageKey> = {
  missing: 'album.missing',
  unsupported: 'album.unsupported',
  damaged: 'album.damaged'
}

/** Clicks inside the sleeve's back must not also turn the sleeve over. */
const keep = (e: MouseEvent | KeyboardEvent): void => e.stopPropagation()

/**
 * The album folder's tracks on the back of the sleeve, each one a button that plays it. Tracks
 * that would not play stay listed, with the reason, so nothing disappears unexplained.
 */
export const AlbumTrackList = memo(() => {
  const t = useT()
  const album = useAlbumStore((s) => s.album)
  const problems = useAlbumStore((s) => s.problems)
  const play = useAlbumStore((s) => s.play)
  const url = usePlayerStore((s) => s.currentTrack?.audioUrl)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  if (!album) return null
  const current = albumIndexOf(album, url)
  const multiDisc = new Set(album.tracks.map((tr) => tr.disc || 1)).size > 1

  return (
    <div onClick={keep} onKeyDown={keep} data-testid="album-tracklist">
      <ol className="pt-1">
        {album.tracks.map((tr, i) => {
          const playing = i === current
          const problem = problems[tr.url]
          const discStart =
            multiDisc && (i === 0 || (album.tracks[i - 1].disc || 1) !== (tr.disc || 1))
          return (
            <li key={tr.url} data-playing={playing ? 'true' : undefined}>
              {discStart && (
                <p className="mt-2 border-b border-white/[0.09] pb-1 text-[11px] font-semibold text-tone first:mt-0">
                  {t('album.disc', { n: tr.disc || 1 })}
                </p>
              )}
              <button
                type="button"
                disabled={Boolean(problem)}
                onClick={() => play(i)}
                aria-current={playing ? 'true' : undefined}
                aria-label={
                  problem
                    ? `${tr.title}. ${t(PROBLEM_KEYS[problem])}`
                    : t('album.playTrack', { title: tr.title })
                }
                className={cn(
                  'group -mx-1.5 flex w-[calc(100%+0.75rem)] items-baseline gap-2 rounded-[6px] px-1.5 py-[3px] text-left text-[11.5px] leading-snug transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
                  playing ? 'bg-white/[0.10] text-ink' : 'text-ink/75 hover:bg-white/[0.06]',
                  problem && 'cursor-default text-ink/40 hover:bg-transparent'
                )}
              >
                <span
                  className={cn(
                    'w-4 shrink-0 text-right tabular-nums',
                    playing ? 'text-tone' : 'text-ink/35'
                  )}
                >
                  {playing && isPlaying ? (
                    <span className="inline-flex h-[9px] items-end gap-[1.5px]" aria-hidden="true">
                      <i className="sleeve-eq block w-[2px] rounded-full bg-tone" />
                      <i className="sleeve-eq block w-[2px] rounded-full bg-tone [animation-delay:-0.4s]" />
                      <i className="sleeve-eq block w-[2px] rounded-full bg-tone [animation-delay:-0.7s]" />
                    </span>
                  ) : (
                    <>
                      <span
                        className={cn(!problem && 'group-hover:hidden group-focus-visible:hidden')}
                      >
                        {tr.track || i + 1}
                      </span>
                      {!problem && (
                        <Play
                          className="hidden h-2.5 w-2.5 translate-y-[1px] fill-current group-hover:inline group-focus-visible:inline"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate',
                      playing && 'font-medium',
                      problem && 'line-through decoration-white/25'
                    )}
                  >
                    {tr.title}
                  </span>
                  {problem && (
                    <span className="block text-[10.5px] text-ink/50 no-underline">
                      {t(PROBLEM_KEYS[problem])}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-ink/40">{clock(tr.duration)}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[10.5px] leading-snug text-ink/45" data-testid="album-order">
        {t(album.order === 'tags' ? 'album.orderTags' : 'album.orderNames')}
        {album.leftOut.length > 0 && (
          <>
            {' '}
            {t('album.leftOut', {
              names:
                album.leftOut.length <= 3
                  ? album.leftOut.join(', ')
                  : `${album.leftOut.slice(0, 2).join(', ')} +${album.leftOut.length - 2}`
            })}
          </>
        )}
      </p>
      <div className="mt-2.5 pb-1">
        <AlbumOpenButton quiet />
      </div>
    </div>
  )
})
AlbumTrackList.displayName = 'AlbumTrackList'
