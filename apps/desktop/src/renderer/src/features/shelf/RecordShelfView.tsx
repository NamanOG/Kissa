import React, { memo, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShelfStore, RecordEntry } from '../../stores/shelfStore'
import { usePlayerStore } from '../../stores/playerStore'
import { possessive } from '../../utils/greeting'
import { Disc3, X, Share, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { SharePreviewModal } from '../share/SharePreviewModal'
import { SharePayload, StatsShareData, AlbumShareData } from '../../../../types/share'

type SortOption = 'recent' | 'added' | 'played' | 'alpha'

export const RecordShelfView = memo(() => {
  const records = useShelfStore((s) => s.records)
  const clearShelf = useShelfStore((s) => s.clearShelf)
  const removeRecord = useShelfStore((s) => s.removeRecord)
  const [sort, setSort] = useState<SortOption>('recent')
  const listenerName = usePlayerStore((s) => s.listenerName)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedForShare, setSelectedForShare] = useState<Set<string>>(new Set())

  const sortedRecords = useMemo(() => {
    const arr = [...records]
    switch (sort) {
      case 'recent':
        return arr.sort((a, b) => b.lastListened - a.lastListened)
      case 'added':
        return arr.sort((a, b) => b.firstListened - a.firstListened)
      case 'played':
        return arr.sort((a, b) => b.playCount - a.playCount)
      case 'alpha':
        return arr.sort((a, b) => a.album.localeCompare(b.album))
      default:
        return arr
    }
  }, [records, sort])

  const selectedRecord = useMemo(() => records.find(r => r.albumKey === selectedAlbum), [records, selectedAlbum])

  const handleShareStats = () => {
    if (records.length === 0) return
    const byPlays = [...records].sort((a, b) => b.playCount - a.playCount)
    const artistPlays = new Map<string, number>()
    for (const r of records) artistPlays.set(r.artist, (artistPlays.get(r.artist) ?? 0) + r.playCount)
    const [topArtistName, topArtistPlays] = [...artistPlays].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    const stats: StatsShareData = {
      totalAlbums: records.length,
      uniqueArtists: artistPlays.size,
      totalPlays: records.reduce((sum, r) => sum + r.playCount, 0),
      firstListenDate: Math.min(...records.map(r => r.firstListened)),
      mostPlayedAlbum: byPlays[0] as unknown as AlbumShareData,
      mostRecentAlbum: [...records].sort((a, b) => b.lastListened - a.lastListened)[0] as unknown as AlbumShareData,
      runnersUp: byPlays.slice(1, 5) as unknown as AlbumShareData[],
      topArtist: topArtistName ? { name: topArtistName, plays: topArtistPlays } : undefined
    }
    setSharePayload({ type: 'stats', data: stats, aspectRatio: '4:5' })
  }

  const handleShareCollection = () => {
    const albums = records.filter(r => selectedForShare.has(r.albumKey)) as unknown as AlbumShareData[]
    if (albums.length === 0) return
    setSharePayload({ type: 'collection', data: albums, aspectRatio: '4:5' })
    setSelectionMode(false)
    setSelectedForShare(new Set())
  }

  const toggleSelection = (key: string) => {
    const next = new Set(selectedForShare)
    if (next.has(key)) {
      next.delete(key)
    } else {
      if (next.size < 9) next.add(key)
    }
    setSelectedForShare(next)
  }

  return (
    <motion.div
      key="shelf-view"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col h-full w-full transform-gpu overflow-hidden mx-auto"
    >
      <header className="flex flex-col min-[1000px]:flex-row min-[1000px]:items-end justify-between shrink-0 mb-6 px-10 min-[900px]:px-16 pt-10 gap-8">
        <div>
          <h1 className="font-serif text-3xl min-[900px]:text-4xl font-medium tracking-tight text-ink flex items-center gap-3">
            <Disc3 className="w-8 h-8 opacity-40" />
            {listenerName.trim() ? `${possessive(listenerName)} Records` : 'My Records'}
          </h1>
          <p className="font-kissa-chassis uppercase tracking-[0.2em] text-[10px] mt-3 text-dim/80">
            {records.length} {records.length === 1 ? 'RECORD' : 'RECORDS'}
          </p>
        </div>
        
        {records.length > 0 && (
          <div className="flex flex-wrap items-center gap-8 border-b border-ink/10 pb-2">
            {!selectionMode ? (
              <>
                <div className="flex items-center gap-6">
                  <SortTab active={sort === 'recent'} onClick={() => setSort('recent')} label="Recent" />
                  <SortTab active={sort === 'added'} onClick={() => setSort('added')} label="Added" />
                  <SortTab active={sort === 'played'} onClick={() => setSort('played')} label="Most Played" />
                  <SortTab active={sort === 'alpha'} onClick={() => setSort('alpha')} label="A-Z" />
                </div>
                <div className="flex items-center gap-4 pl-6 border-l border-ink/10">
                  <button 
                    type="button" 
                    onClick={() => setSelectionMode(true)}
                    className="text-[12.5px] font-semibold cursor-pointer text-dim hover:text-ink transition-colors"
                  >
                    Select to share
                  </button>
                  <button 
                    type="button" 
                    onClick={handleShareStats}
                    className="text-[12.5px] font-semibold cursor-pointer text-tone hover:text-tone/80 transition-colors"
                  >
                    Share my stats
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[12.5px] font-semibold cursor-pointer text-red-500/70 hover:text-red-500 transition-colors ml-4"
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <span className="text-[12.5px] font-semibold text-tone">
                  {selectedForShare.size} of 9 selected
                </span>
                <button 
                  type="button" 
                  onClick={handleShareCollection}
                  disabled={selectedForShare.size === 0}
                  className="text-[12.5px] font-semibold cursor-pointer text-ink hover:opacity-80 disabled:opacity-30 transition-colors"
                >
                  Share
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectionMode(false)
                    setSelectedForShare(new Set())
                  }}
                  className="text-[12.5px] font-semibold cursor-pointer text-dim hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <AnimatePresence>
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-[420px] bg-[#141216] border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-6"
            >
              <h3 className="font-serif text-xl font-medium tracking-tight text-white mb-3">Clear Shelf</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                This only removes records from your Kissa shelf. It does not affect Spotify, Apple Music, your music libraries, or playback history.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearShelf()
                    setShowClearConfirm(false)
                    setSelectedAlbum(null)
                  }}
                  className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-95 transition-[transform,background-color] shadow-md cursor-pointer"
                >
                  Clear Shelf
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 pb-32 select-none opacity-80">
          <div className="w-48 h-28 border border-panel-line rounded-sm flex items-end p-4 mb-6 relative overflow-hidden bg-black/40 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)]">
            <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-panel-line/50" />
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-panel-line/50" />
            <span className="font-kissa-chassis text-[9.5px] uppercase tracking-[0.2em] font-bold text-dim">
              EMPTY SHELF
            </span>
          </div>
          <p className="font-kissa-chassis text-[11px] uppercase tracking-[0.1em] leading-relaxed text-dim text-center max-w-xs">
            Play something in Spotify, Apple Music or TIDAL. Each album you listen to is kept here.
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
          <div 
            className="grid gap-x-10 min-[900px]:gap-x-12 gap-y-16 px-10 min-[900px]:px-16 pb-32 max-w-[2400px] mx-auto w-full"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            <AnimatePresence>
              {sortedRecords.map((record) => (
                <motion.div
                  layout
                  key={record.albumKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <RecordItem 
                    record={record} 
                    isSelected={selectedAlbum === record.albumKey}
                    onClick={() => {
                      if (selectionMode) toggleSelection(record.albumKey)
                      else setSelectedAlbum(selectedAlbum === record.albumKey ? null : record.albumKey)
                    }}
                    selectionMode={selectionMode}
                    isSelectedForShare={selectedForShare.has(record.albumKey)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedAlbum && selectedRecord && !selectionMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlbum(null)}
              className="absolute inset-0 pointer-events-auto z-30"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 240 }}
              role="dialog"
              aria-label={`${selectedRecord.album} by ${selectedRecord.artist}`}
              className="absolute bottom-0 right-0 top-0 z-40 flex w-[400px] flex-col overflow-hidden border-l border-ink/[0.06] bg-[var(--deck-bg)] shadow-[-24px_0_80px_rgba(0,0,0,0.6)] min-[1400px]:w-[440px]"
            >
              {/* Lit by its own cover, like the record on the deck. */}
              {selectedRecord.artworkUrl && (
                <img
                  src={selectedRecord.artworkUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 left-1/2 h-[70%] w-[160%] -translate-x-1/2 object-cover opacity-30 blur-3xl"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[var(--deck-bg)]/70 to-[var(--deck-bg)]" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setSelectedAlbum(null)}
                className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.08] hover:text-ink cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative flex-1 overflow-y-auto no-scrollbar px-9 pb-6 pt-16">
                <div className="relative aspect-square w-[70%]">
                  {/* The record peeking out of its sleeve. */}
                  <div
                    className="absolute right-[-30%] top-[4%] aspect-square w-[92%] rounded-full border border-ink/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                    style={{ backgroundImage: 'repeating-radial-gradient(#101010 0px, #191919 2px, #101010 4px)' }}
                    aria-hidden="true"
                  >
                    <div className="absolute left-1/2 top-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
                      {selectedRecord.artworkUrl && <img src={selectedRecord.artworkUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                  </div>
                  <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#1a1411] shadow-[0_24px_50px_rgba(0,0,0,0.6)]">
                    {selectedRecord.artworkUrl ? (
                      <img src={selectedRecord.artworkUrl} alt={selectedRecord.album} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Disc3 className="h-12 w-12 text-tone/30" />
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="mt-9 font-kissa-editorial text-[30px] font-normal leading-[1.08] text-ink text-balance">{selectedRecord.album}</h2>
                <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.2em] text-tone">{selectedRecord.artist}</p>

                <dl className="mt-8 grid grid-cols-3 border-y border-ink/[0.08] py-5">
                  <div>
                    <dd className="font-kissa-editorial text-[30px] leading-none text-ink tabular-nums">{selectedRecord.playCount}</dd>
                    <dt className="mt-2 text-[11px] text-dim">{selectedRecord.playCount === 1 ? 'play' : 'plays'}</dt>
                  </div>
                  <div className="border-l border-ink/[0.08] pl-5">
                    <dd className="font-kissa-editorial text-[22px] leading-[1.36] text-ink">{shelfDate(selectedRecord.firstListened)}</dd>
                    <dt className="mt-2 text-[11px] text-dim">first played</dt>
                  </div>
                  <div className="border-l border-ink/[0.08] pl-5">
                    <dd className="font-kissa-editorial text-[22px] leading-[1.36] text-ink">{shelfDate(selectedRecord.lastListened)}</dd>
                    <dt className="mt-2 text-[11px] text-dim">last played</dt>
                  </div>
                </dl>

                {selectedRecord.tracksEncountered.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">Songs you have played</p>
                    <ol className="mt-3">
                      {selectedRecord.tracksEncountered.map((t, i) => (
                        <li key={i} className="flex items-baseline gap-4 border-b border-ink/[0.05] py-2.5 last:border-b-0">
                          <span className="w-5 shrink-0 font-mono text-[11px] text-dim/70 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                          <span className="truncate text-[13.5px] text-ink/90">{t}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="relative flex shrink-0 items-center gap-3 border-t border-ink/[0.06] px-9 py-5">
                <button
                  type="button"
                  onClick={() => {
                    setSharePayload({ type: 'album', data: selectedRecord as unknown as AlbumShareData, aspectRatio: '4:5' })
                  }}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-tone text-[12.5px] font-bold text-[var(--surface)] transition-transform cursor-pointer active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  <Share className="h-4 w-4" />
                  Share a card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeRecord(selectedRecord.albumKey)
                    setSelectedAlbum(null)
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-dim transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                  aria-label="Remove from the shelf"
                  title="Remove from the shelf"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SharePreviewModal 
        payload={sharePayload} 
        onClose={() => setSharePayload(null)} 
      />
    </motion.div>
  )
})

RecordShelfView.displayName = 'RecordShelfView'

/** Today, yesterday, a date this year, or a date with the year. */
function shelfDate(time: number): string {
  const d = new Date(time)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, d.getFullYear() === today.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

function SortTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative pb-[9px] group"
    >
      <span className={cn(
        "font-kissa-chassis text-[10px] uppercase tracking-[0.15em] transition-colors duration-ui",
        active ? "text-ink font-semibold" : "text-dim/60 group-hover:text-dim font-medium"
      )}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="sort-indicator"
          className="absolute left-0 right-0 bottom-0 h-[2px] bg-tone shadow-[0_0_8px_var(--accent)]" 
        />
      )}
    </button>
  )
}

const RecordItem = memo(({ record, isSelected, onClick, selectionMode, isSelectedForShare }: { record: RecordEntry, isSelected: boolean, onClick: () => void, selectionMode: boolean, isSelectedForShare: boolean }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlayingThisAlbum = currentTrack?.album?.toLowerCase() === record.album.toLowerCase() && 
                             currentTrack?.artist?.toLowerCase() === record.artist.toLowerCase()

  return (
    <div className={cn("flex flex-col relative group cursor-pointer", isSelected ? "z-20" : "hover:z-20")} onClick={onClick}>
      <div 
        className={cn(
          "relative w-full aspect-square transform-gpu transition-[transform,box-shadow,border-color] duration-content ease-primary rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15),inset_1px_0_0_rgba(255,255,255,0.1)]",
          isSelected && !selectionMode ? "-translate-y-[6px] shadow-[0_16px_40px_rgba(0,0,0,0.8)]" : "hover:-translate-y-[3px] group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.7)] z-10 hover:z-20",
          isSelectedForShare ? "border-2 border-tone" : "border-2 border-transparent"
        )}
      >
        {!selectionMode && (
          <div 
            className={cn(
              "absolute top-1/2 -right-4 w-[90%] aspect-square rounded-full bg-[#111] -translate-y-1/2 transition-transform duration-content ease-primary z-0 border border-ink/10",
              "shadow-[-4px_0_12px_rgba(0,0,0,0.5)]",
              isSelected || isPlayingThisAlbum ? "translate-x-12 min-[900px]:translate-x-16 rotate-[24deg]" : "group-hover:translate-x-6 min-[900px]:group-hover:translate-x-8 group-hover:rotate-12",
              isPlayingThisAlbum ? "animate-spin-slow" : ""
            )}
            style={{ backgroundImage: 'repeating-radial-gradient(#111 0px, #1a1a1a 2px, #111 4px)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 aspect-square rounded-full border border-white/10 overflow-hidden">
              {record.artworkUrl ? (
                 <img src={record.artworkUrl} className="w-full h-full object-cover opacity-80" alt="" />
              ) : (
                 <div className="w-full h-full bg-tone opacity-80" />
              )}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#e8e4db]" />
          </div>
        )}

        <div className="absolute inset-0 z-10 rounded-sm overflow-hidden bg-[#1a1411]">
          {record.artworkUrl ? (
            <img src={record.artworkUrl} alt={record.album} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Disc3 className="w-12 h-12 text-tone/30 mb-2" />
              <span className="text-[10px] font-mono text-white/30 text-center uppercase break-all">{record.album}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {selectionMode && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-colors flex items-center justify-center">
           {isSelectedForShare ? (
             <div className="w-1.5 h-1.5 rounded-full bg-tone shadow-[0_0_8px_var(--accent)]" />
           ) : (
             <div className="w-1 h-1 rounded-full bg-white/10" />
           )}
        </div>
      )}

      <div className="mt-4 flex flex-col px-1 z-10 transition-opacity" style={{ opacity: isSelected ? 1 : 0.85 }}>
        <h3 className="font-serif text-[16px] leading-snug font-medium tracking-tight text-ink truncate">
          {record.album}
        </h3>
        <p className="font-kissa-chassis text-[9.5px] uppercase tracking-[0.15em] mt-1 text-dim truncate">
          {record.artist}
        </p>
      </div>
    </div>
  )
})
RecordItem.displayName = 'RecordItem'
