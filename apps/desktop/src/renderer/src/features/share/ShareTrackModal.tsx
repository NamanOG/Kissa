import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy, ExternalLink } from 'lucide-react'
import type { TrackInfo } from '@renderer/stores/playerStore'
import albumPlaceholder from '@renderer/media/placeholder-album.png'

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
  const sourceName = sourceInfo?.label || track.source

  let text = `Listening to ${track.title} by ${track.artist}`
  if (sourceName) {
    text += `\non ${sourceName} with Kissa.`
  } else {
    text += ` with Kissa.`
  }

  if (sourceInfo?.url) {
    text += `\n\nFind the track on ${sourceInfo.label}:\n${sourceInfo.url}`
  }

  text += `\n\nListen with Kissa:\nhttps://github.com/NamanOG/Kissa`
  return text
}

export const ShareTrackModal: React.FC<ShareTrackModalProps> = ({ isOpen, onClose, track }) => {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCopiedText(false)
      setCopiedLink(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!track) return null

  const sourceInfo = getSourceSearchUrl(track.source, track.title, track.artist)
  const shareText = buildShareText(track)

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      // Ignore clipboard write failure
    }
  }

  const handleCopyLink = async () => {
    if (!sourceInfo?.url) return
    try {
      await navigator.clipboard.writeText(sourceInfo.url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // Ignore clipboard write failure
    }
  }

  const handleOpenSource = () => {
    if (sourceInfo?.url && window.electron?.openExternal) {
      window.electron.openExternal(sourceInfo.url)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[440px] bg-[var(--panel-bg)] border border-white/[0.08] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.8)] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-white/[0.06]">
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-[var(--on-surface)]">Share Track</span>
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {track.source ? `${track.source} · Following` : 'Kissa Player'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Track Info Preview */}
            <div className="p-5 flex items-center gap-4">
              <img
                src={track.artworkUrl || albumPlaceholder}
                alt={track.title}
                className="w-16 h-16 rounded-xl object-cover shadow-md border border-white/[0.08] shrink-0"
                onError={(e) => {
                  e.currentTarget.src = albumPlaceholder
                }}
              />
              <div className="flex flex-col min-w-0">
                <h4 className="text-[14px] font-medium text-[var(--on-surface)] truncate">
                  {track.title}
                </h4>
                <p className="text-[12px] text-[var(--muted)] truncate mt-0.5">
                  {track.artist}
                </p>
                {track.album && track.album !== track.title && (
                  <p className="text-[11px] text-[var(--muted)]/60 truncate mt-0.5">
                    {track.album}
                  </p>
                )}
              </div>
            </div>

            {/* Share Text Preview Area */}
            <div className="px-5 pb-4">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] text-[11.5px] font-mono leading-relaxed text-[var(--muted)] select-all whitespace-pre-wrap max-h-36 overflow-y-auto">
                {shareText}
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {sourceInfo?.url && (
                  <button
                    type="button"
                    onClick={handleOpenSource}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[var(--on-surface)] text-[11.5px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
                    Open in {sourceInfo.label}
                  </button>
                )}
                {sourceInfo?.url && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[var(--on-surface)] text-[11.5px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Copied Link
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                        Copy Link
                      </>
                    )}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyText}
                className="ml-auto px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-all cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/25 active:scale-95 flex items-center gap-1.5"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Share Text
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
