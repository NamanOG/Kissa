import { memo, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ListMusic, X } from 'lucide-react'
import { useT } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { useSidesStore } from './sidesStore'
import { SleeveBack } from './SleeveBack'
import { useAlbumOnDeck } from '@renderer/features/album/AlbumEntry'

const setTurned = (next: boolean): void => useSidesStore.setState({ sleeveTurned: next })

/**
 * The plainly labelled way to the track list, beside the record's details. It turns the sleeve
 * over (or, in a narrow window with no sleeve on show, opens the back as a card), and says when
 * there is no list yet and why, instead of disappearing.
 */
export const TracklistButton = memo(() => {
  const t = useT()
  const turned = useSidesStore((s) => s.sleeveTurned)
  const lookup = useSidesStore((s) => s.lookup)
  const local = useAlbumOnDeck()
  const hasSides = useSidesStore((s) => Boolean(s.sides)) || local

  const label = turned
    ? t('sleeve.hide')
    : hasSides
      ? t('sleeve.tracklist')
      : lookup === 'finding'
        ? t('sleeve.finding')
        : t('sleeve.none')

  return (
    <button
      type="button"
      data-testid="tracklist-button"
      data-state={hasSides ? 'ready' : lookup}
      aria-expanded={turned}
      onClick={() => setTurned(!turned)}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone active:scale-[0.97]',
        turned ? 'bg-white/[0.08] text-ink' : hasSides ? 'text-dim' : 'text-dim/70'
      )}
    >
      <ListMusic
        className={cn(
          'h-3.5 w-3.5',
          lookup === 'finding' && !hasSides && 'motion-safe:animate-pulse'
        )}
        aria-hidden="true"
      />
      <span className="text-[12px]">{label}</span>
    </button>
  )
})
TracklistButton.displayName = 'TracklistButton'

export interface TracklistCardProps {
  artworkUrl: string
  album: string
  artist: string
  hasAlbum: boolean
}

/** Native modal semantics, shared by the sleeve and Up next. No blur over the moving deck. */
export function TracklistDialog({
  open,
  onClose,
  label,
  children,
  wide = false
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  wide?: boolean
}): React.JSX.Element | null {
  const t = useT()
  const reduce = useReducedMotion()
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const node = dialog.current
    node?.showModal()
    close.current?.focus()
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', escape, true)
    return () => {
      window.removeEventListener('keydown', escape, true)
      node?.close()
      opener?.focus?.()
    }
  }, [open])
  if (!open) return null
  return createPortal(
    <dialog
      ref={dialog}
      aria-label={label}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-4 text-ink backdrop:bg-black/45"
    >
      <motion.div
        data-testid="tracklist-card"
        className={cn(
          'relative mx-auto mt-[max(40px,calc((100dvh-420px)/2))] h-[min(380px,calc(100dvh-88px))]',
          wide ? 'w-[min(400px,calc(100vw-32px))]' : 'w-[min(320px,calc(100vw-32px))]'
        )}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label={t('sleeve.close')}
          className="absolute -top-10 right-0 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#211c18] px-3 text-[12px] font-medium text-white/90 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18)] hover:bg-[#302820] focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {t('sleeve.close')}
        </button>
      </motion.div>
    </dialog>,
    document.body
  )
}

export const TracklistCard = memo(({ artworkUrl, album, artist, hasAlbum }: TracklistCardProps) => {
  const t = useT()
  const open = useSidesStore((s) => s.sleeveTurned)
  return (
    <TracklistDialog open={open} onClose={() => setTurned(false)} label={t('sleeve.tracklist')}>
      <SleeveBack artworkUrl={artworkUrl} album={album} artist={artist} shown hasAlbum={hasAlbum} />
    </TracklistDialog>
  )
})
TracklistCard.displayName = 'TracklistCard'
