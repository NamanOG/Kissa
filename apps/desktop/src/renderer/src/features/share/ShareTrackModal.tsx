import React, { useState, useEffect, useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import type { TrackInfo } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { KISSA_STORE_URL } from '@renderer/utils/links'
import { cn } from '@renderer/utils/cn'

interface ShareTrackModalProps {
  isOpen: boolean
  onClose: () => void
  track: TrackInfo | null
}

export function getSourceSearchUrl(
  source: string | undefined,
  title: string,
  artist: string
): { url: string; label: string } | null {
  const cleanTitle = (title || '').trim()
  const cleanArtist = (artist || '').trim()
  const query = `${cleanTitle} ${cleanArtist}`.trim()
  if (!query) return null
  const encoded = encodeURIComponent(query)
  const lower = (source || '').toLowerCase()

  if (lower.includes('spotify')) {
    return {
      url: `https://open.spotify.com/search/${encoded}`,
      label: 'Spotify'
    }
  }
  if (lower.includes('apple') || lower.includes('itunes')) {
    return {
      url: `https://music.apple.com/us/search?term=${encoded}`,
      label: 'Apple Music'
    }
  }
  if (lower.includes('tidal')) {
    return {
      url: `https://listen.tidal.com/search?q=${encoded}`,
      label: 'TIDAL'
    }
  }
  if (lower.includes('youtube')) {
    return {
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      label: 'YouTube'
    }
  }
  if (source && source !== 'Media Player' && source !== 'Browser') {
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' music')}`,
      label: source
    }
  }
  return null
}

export function buildShareText(track: TrackInfo): string {
  const sourceInfo = getSourceSearchUrl(track.source, track.title, track.artist)
  const lines = [`Listening to ${track.title} by ${track.artist}, on a turntable in Kissa.`]
  if (sourceInfo?.url) lines.push('', `${sourceInfo.label}: ${sourceInfo.url}`)
  lines.push('', `Kissa, a vinyl player for Windows: ${KISSA_STORE_URL}`)
  return lines.join('\n')
}

type Copied = 'message' | 'link' | null

/**
 * Share the track: the record, the message as it will read, and three plain actions.
 * The message links to the song in the player it came from and to Kissa on the Store.
 */
export const ShareTrackModal: React.FC<ShareTrackModalProps> = ({ isOpen, onClose, track }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, isOpen)
  const [copied, setCopied] = useState<Copied>(null)

  useEffect(() => {
    if (!isOpen) setCopied(null)
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!track) return null

  const sourceInfo = getSourceSearchUrl(track.source, track.title, track.artist)
  const shareText = buildShareText(track)

  const copy = async (what: Exclude<Copied, null>, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000)
    } catch {
      // Clipboard unavailable: nothing to do, the text is on screen to select.
    }
  }

  const openSource = (): void => {
    if (sourceInfo?.url) void window.electron?.openExternal?.(sourceInfo.url)
  }

  const secondary =
    'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-ink/[0.05] px-4 text-[12.5px] font-semibold text-ink transition-colors hover:bg-ink/[0.1] cursor-pointer active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone'

  // Rendered at the top of the page: inside the Deck's panel a transformed parent would trap it.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-[28px] border border-ink/[0.08] bg-[var(--deck-bg)] shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* The record, lit by its own cover. */}
            <div className="relative overflow-hidden px-8 pb-7 pt-8">
              <img
                src={track.artworkUrl || albumPlaceholder}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-3xl"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--deck-bg)]" aria-hidden="true" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.08] hover:text-ink cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-center gap-6">
                <img
                  src={track.artworkUrl || albumPlaceholder}
                  alt={track.album || track.title}
                  className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-[0_14px_34px_rgba(0,0,0,0.55)]"
                  onError={(e) => {
                    e.currentTarget.src = albumPlaceholder
                  }}
                />
                <div className="min-w-0">
                  <p id="share-title" className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-tone">
                    Share Track
                  </p>
                  <h2 className="mt-[calc(0.5rem-0.14em)] pt-[0.14em] line-clamp-2 font-kissa-editorial text-[26px] font-normal leading-[1.1] text-ink">{track.title}</h2>
                  <p className="mt-1.5 truncate text-[13.5px] text-ink/80">{track.artist}</p>
                  {track.album && track.album !== track.title && (
                    <p className="mt-0.5 truncate text-[12.5px] text-dim">{track.album}</p>
                  )}
                </div>
              </div>
            </div>

            {/* The message, as it will read when pasted. */}
            <div className="px-8">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">Message</p>
              <div className="rounded-2xl border border-ink/[0.07] bg-black/25 px-5 py-4 text-[13px] leading-relaxed text-ink/85 select-text">
                <p>
                  Listening to <span className="text-ink">{track.title}</span> by {track.artist}, on a turntable in Kissa.
                </p>
                {sourceInfo?.url && (
                  <p className="mt-2.5 truncate text-dim">
                    {sourceInfo.label}: <span className="text-ink/70">{sourceInfo.url.replace(/^https:\/\//, '')}</span>
                  </p>
                )}
                <p className="mt-2.5 truncate text-dim">
                  Kissa, a vinyl player for Windows: <span className="text-ink/70">{KISSA_STORE_URL.replace(/^https:\/\//, '')}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 px-8 pb-8 pt-6">
              <button
                type="button"
                onClick={() => void copy('message', shareText)}
                className="col-span-2 inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-tone px-5 text-[12.5px] font-bold text-[var(--surface)] transition-transform cursor-pointer active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
              >
                {copied === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'message' ? 'Copied' : 'Copy message'}
              </button>
              {sourceInfo?.url && (
                <>
                  <button type="button" onClick={() => void copy('link', sourceInfo.url)} className={secondary}>
                    {copied === 'link' ? <Check className="h-4 w-4 text-tone" /> : <Link2 className="h-4 w-4 text-dim" />}
                    {copied === 'link' ? 'Link copied' : 'Copy song link'}
                  </button>
                  <button type="button" onClick={openSource} className={secondary}>
                    <ExternalLink className="h-4 w-4 text-dim" />
                    Open in {sourceInfo.label}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}