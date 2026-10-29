import { memo, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { useT } from '@renderer/i18n'
import { TracklistDialog } from '@renderer/features/sides/Tracklist'
import { playQueueIndex, useQueueSnapshot } from './queueSnapshot'
import type { RemoteQueue } from '../../../../types/remoteQueue'

export function queueDescription(
  queue: RemoteQueue
): 'queue.albumOrder' | 'queue.localOrder' | 'queue.internalOrder' | 'queue.empty' {
  return queue.kind === 'album-info'
    ? 'queue.albumOrder'
    : queue.kind === 'album'
      ? 'queue.localOrder'
      : queue.kind === 'queue'
        ? 'queue.internalOrder'
        : 'queue.empty'
}

export const UpNextList = memo(() => {
  const t = useT()
  const queue = useQueueSnapshot()
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/15 bg-[color-mix(in_srgb,var(--accent)_9%,#191511)] p-5 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_60px_-20px_rgba(0,0,0,0.7)]"
      data-testid="up-next-list"
    >
      <h2 className="font-kissa-editorial text-[25px] leading-tight">
        {t(queue.kind === 'album-info' ? 'queue.onAlbum' : 'queue.title')}
      </h2>
      <p className="mt-1 truncate text-[13px] text-ink/80">{queue.title}</p>
      <p className="mb-3 mt-2 text-[12px] leading-relaxed text-ink/70">
        {t(queueDescription(queue))}
      </p>
      <ol
        className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]"
        aria-label={t('queue.tracks')}
      >
        {queue.rows.map((row) => {
          const text = (
            <>
              <span className="w-6 shrink-0 text-right tabular-nums text-ink/60" aria-hidden="true">
                {row.index + 1}
              </span>
              <span className="min-w-0 flex-1 break-words">
                {row.title || t('queue.untitled')}
                {row.current && (
                  <span className="block text-[10px] font-medium text-tone">
                    {t('queue.current')}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-ink/65">
                {row.duration > 0
                  ? `${Math.floor(row.duration / 60)}:${String(Math.floor(row.duration % 60)).padStart(2, '0')}`
                  : ''}
              </span>
            </>
          )
          const style = `flex min-h-11 w-full items-center gap-2 rounded-[9px] px-2 py-2 text-left text-[12px] leading-snug ${row.current ? 'bg-white/10 text-tone' : 'text-ink/85'}`
          return (
            <li key={row.index} aria-current={row.current ? 'true' : undefined}>
              {row.playable ? (
                <button
                  type="button"
                  className={`${style} hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone`}
                  aria-label={t('album.playTrack', { title: row.title })}
                  onClick={() => playQueueIndex(row.index, queue.revision)}
                >
                  {text}
                </button>
              ) : (
                <div className={style}>
                  {text}
                  {queue.kind !== 'album-info' && (
                    <span className="text-[10px]">{t('queue.unavailable')}</span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {!queue.rows.length && (
        <p role="status" className="py-5 text-[13px] text-ink/70">
          {t(queue.status === 'finding' ? 'queue.finding' : 'queue.empty')}
        </p>
      )}
      {queue.total > queue.rows.length && (
        <p className="mt-3 text-[11px] text-ink/70">
          {t('queue.bounded', { shown: queue.rows.length, total: queue.total })}
        </p>
      )}
    </div>
  )
})
UpNextList.displayName = 'UpNextList'

export const UpNextButton = memo(() => {
  const t = useT()
  const [open, setOpen] = useState(false)
  const queue = useQueueSnapshot()
  const label = t(queue.kind === 'album-info' ? 'queue.onAlbum' : 'queue.title')
  // Shown only for a queue Kissa really plays. Streaming apps keep their queue to themselves,
  // and an album list is no help to someone playing their own playlist (Track list covers albums).
  if (queue.kind !== 'album' && queue.kind !== 'queue' && !open) return null
  return (
    <>
      <button
        type="button"
        data-testid="up-next-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-dim hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
      >
        <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
      <TracklistDialog open={open} onClose={() => setOpen(false)} label={label} wide>
        <UpNextList />
      </TracklistDialog>
    </>
  )
})
UpNextButton.displayName = 'UpNextButton'
