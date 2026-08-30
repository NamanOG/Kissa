import React, { memo, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShelfStore, RecordEntry } from '../../stores/shelfStore'
import { usePlayerStore } from '../../stores/playerStore'
import { Play, Disc3, X, Share, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { SharePreviewModal } from '../share/SharePreviewModal'
import { SharePayload, StatsShareData, AlbumShareData } from '../../../../types/share'

type SortOption = 'recent' | 'added' | 'played' | 'alpha'

export const RecordShelfView = memo(() => {
  const records = useShelfStore((s) => s.records)
  const clearShelf = useShelfStore((s) => s.clearShelf)
  const removeRecord = useShelfStore((s) => s.removeRecord)
  const [sort, setSort] = useState<SortOption>('recent')
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  // Share state
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
    const stats: StatsShareData = {
      totalAlbums: records.length,
      uniqueArtists: new Set(records.map(r => r.artist)).size,
      totalPlays: records.reduce((sum, r) => sum + r.playCount, 0),
      firstListenDate: Math.min(...records.map(r => r.firstListened)),
      mostPlayedAlbum: [...records].sort((a, b) => b.playCount - a.playCount)[0] as unknown as AlbumShareData,
      mostRecentAlbum: [...records].sort((a, b) => b.lastListened - a.lastListened)[0] as unknown as AlbumShareData
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
          <h1 className="font-serif text-3xl min-[900px]:text-4xl font-medium tracking-tight text-[var(--on-surface)] flex items-center gap-3">
            <Disc3 className="w-8 h-8 opacity-40" />
            My Records
          </h1>
          <p className="font-kissa-chassis uppercase tracking-[0.2em] text-[10px] mt-3 text-[var(--muted)]/80">
            {records.length} {records.length === 1 ? 'RECORD' : 'RECORDS'} // ARCHIVAL STORAGE
          </p>
        </div>
        
        {records.length > 0 && (
          <div className="flex flex-wrap items-center gap-8 border-b border-white/5 pb-2">
            {!selectionMode ? (
              <>
                <div className="flex items-center gap-6">
                  <SortTab active={sort === 'recent'} onClick={() => setSort('recent')} label="Recent" />
                  <SortTab active={sort === 'added'} onClick={() => setSort('added')} label="Added" />
                  <SortTab active={sort === 'played'} onClick={() => setSort('played')} label="Most Played" />
                  <SortTab active={sort === 'alpha'} onClick={() => setSort('alpha')} label="A-Z" />
                </div>
                <div className="flex items-center gap-4 pl-6 border-l border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setSelectionMode(true)}
                    className="text-[10px] uppercase font-kissa-chassis tracking-[0.15em] text-[var(--muted)] hover:text-white transition-colors"
                  >
                    SELECT
                  </button>
                  <button 
                    type="button" 
                    onClick={handleShareStats}
                    className="text-[10px] uppercase font-kissa-chassis tracking-[0.15em] text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
                  >
                    STATS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[10px] uppercase font-kissa-chassis tracking-[0.15em] text-red-500/70 hover:text-red-500 transition-colors ml-4"
                  >
                    CLEAR
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-kissa-chassis tracking-[0.15em] uppercase text-[var(--accent)]">
                  {selectedForShare.size}/9 SELECTED
                </span>
                <button 
                  type="button" 
                  onClick={handleShareCollection}
                  disabled={selectedForShare.size === 0}
                  className="text-[10px] uppercase font-kissa-chassis tracking-[0.15em] text-white hover:text-white/80 disabled:opacity-30 transition-colors"
                >
                  SHARE
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectionMode(false)
                    setSelectedForShare(new Set())
                  }}
                  className="text-[10px] uppercase font-kissa-chassis tracking-[0.15em] text-[var(--muted)] hover:text-white transition-colors"
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Clear Shelf Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
        <div className="flex-1 flex flex-col items-center justify-center p-10 pb-32 select-none opacity-50">
          <div className="w-48 h-28 border border-[var(--panel-border)] rounded-sm flex items-end p-4 mb-6 relative overflow-hidden bg-black/40 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)]">
            <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[var(--panel-border)]/50" />
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[var(--panel-border)]/50" />
            <span className="font-kissa-chassis text-[9.5px] uppercase tracking-[0.2em] font-bold text-[var(--muted)]">
              CRATE 01 // EMPTY
            </span>
          </div>
          <p className="font-kissa-chassis text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]/80 text-center max-w-xs">
            Awaiting physical media. Audio played via Kissa will be archived here.
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
          {/* Grid Layout for Albums */}
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

      {/* Record Inspector Overlay */}
      <AnimatePresence>
        {selectedAlbum && selectedRecord && !selectionMode && (
          <>
            {/* Subtle backdrop to obscure records slightly */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlbum(null)}
              className="absolute inset-0 bg-black/30 pointer-events-auto z-30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute right-0 top-0 bottom-0 w-[340px] min-[1400px]:w-[380px] bg-[#121013] border-l border-white/[0.03] shadow-[-16px_0_64px_rgba(0,0,0,0.8)] z-40 flex flex-col border-t border-t-white/[0.02]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                <span className="font-kissa-chassis text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]/60">
                  Record Inspector
                </span>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="text-[var(--muted)] hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                <div className="w-full aspect-square rounded-sm overflow-hidden mb-6 shadow-xl border border-white/5 relative bg-[#1a1411]">
                  {selectedRecord.artworkUrl ? (
                    <img src={selectedRecord.artworkUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <Disc3 className="w-12 h-12 text-[var(--accent)]/30 mb-2" />
                    </div>
                  )}
                  {/* Sleeve highlight/shading */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
                </div>

                <h2 className="font-serif text-2xl font-medium tracking-tight text-[var(--on-surface)] leading-tight mb-1">
                  {selectedRecord.album}
                </h2>
                <p className="font-kissa-chassis text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]/70">
                  {selectedRecord.artist}
                </p>

                <div className="mt-8 flex gap-4">
                  <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-md p-4 flex flex-col">
                    <span className="font-kissa-chassis text-[9px] uppercase tracking-[0.15em] text-[var(--muted)]/50 mb-1">Plays</span>
                    <span className="font-mono text-lg text-[var(--on-surface)]">{selectedRecord.playCount}</span>
                  </div>
                  <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-md p-4 flex flex-col">
                    <span className="font-kissa-chassis text-[9px] uppercase tracking-[0.15em] text-[var(--muted)]/50 mb-1">Last Played</span>
                    <span className="font-mono text-[13px] text-[var(--on-surface)] mt-1">{new Date(selectedRecord.lastListened).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-8 pb-4">
                  <span className="font-kissa-chassis text-[9px] uppercase tracking-[0.15em] text-[var(--muted)]/50 block mb-3">
                    Tracks Encountered
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {selectedRecord.tracksEncountered.map((t, i) => (
                      <div key={i} className="text-[12px] px-3 py-2 border border-white/[0.03] bg-white/[0.01] rounded flex items-center gap-3">
                        <Play className="w-3 h-3 text-[var(--muted)]/30 shrink-0" />
                        <span className="text-[var(--on-surface)]/80 truncate font-medium">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/5 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    setSharePayload({ type: 'album', data: selectedRecord as unknown as AlbumShareData, aspectRatio: '4:5' })
                  }}
                  className="flex-1 py-3 bg-white/[0.03] hover:bg-[var(--accent)] hover:text-black border border-white/10 hover:border-[var(--accent)] text-[10px] uppercase font-kissa-chassis tracking-[0.15em] transition-colors rounded shadow-sm text-white flex items-center justify-center gap-2"
                >
                  <Share className="w-3.5 h-3.5" />
                  Share
                </button>
                <button
                  onClick={() => {
                    removeRecord(selectedRecord.albumKey)
                    setSelectedAlbum(null)
                  }}
                  className="py-3 px-4 bg-white/[0.03] hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-[10px] uppercase font-kissa-chassis tracking-[0.15em] transition-colors rounded shadow-sm text-[var(--muted)]"
                  title="Remove from Shelf"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share Preview Modal */}
      <SharePreviewModal 
        payload={sharePayload} 
        onClose={() => setSharePayload(null)} 
      />
    </motion.div>
  )
})

RecordShelfView.displayName = 'RecordShelfView'

function SortTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative pb-[9px] group"
    >
      <span className={cn(
        "font-kissa-chassis text-[10px] uppercase tracking-[0.15em] transition-colors duration-ui",
        active ? "text-white font-semibold" : "text-[var(--muted)]/60 group-hover:text-[var(--muted)] font-medium"
      )}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="sort-indicator"
          className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" 
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
      {/* Album Cover / Sleeve */}
      <div 
        className={cn(
          "relative w-full aspect-square transform-gpu transition-[transform,box-shadow,border-color] duration-content ease-primary rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15),inset_1px_0_0_rgba(255,255,255,0.1)]",
          isSelected && !selectionMode ? "-translate-y-[6px] shadow-[0_16px_40px_rgba(0,0,0,0.8)]" : "hover:-translate-y-[3px] group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.7)] z-10 hover:z-20",
          isSelectedForShare ? "border-2 border-[var(--accent)]" : "border-2 border-transparent"
        )}
      >
        {/* Record sticking out on hover/select */}
        {!selectionMode && (
          <div 
            className={cn(
              "absolute top-1/2 -right-4 w-[90%] aspect-square rounded-full bg-[#111] -translate-y-1/2 transition-transform duration-content ease-primary z-0 border border-white/5",
              "shadow-[-4px_0_12px_rgba(0,0,0,0.5)]",
              isSelected || isPlayingThisAlbum ? "translate-x-12 min-[900px]:translate-x-16 rotate-[24deg]" : "group-hover:translate-x-6 min-[900px]:group-hover:translate-x-8 group-hover:rotate-12",
              isPlayingThisAlbum ? "animate-spin-slow" : ""
            )}
            style={{ backgroundImage: 'repeating-radial-gradient(#111 0px, #1a1a1a 2px, #111 4px)' }}
          >
            {/* Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 aspect-square rounded-full border border-white/10 overflow-hidden">
              {record.artworkUrl ? (
                 <img src={record.artworkUrl} className="w-full h-full object-cover opacity-80" alt="" />
              ) : (
                 <div className="w-full h-full bg-[var(--accent)] opacity-80" />
              )}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#e8e4db]" />
          </div>
        )}

        {/* Sleeve Image */}
        <div className="absolute inset-0 z-10 rounded-sm overflow-hidden bg-[#1a1411]">
          {record.artworkUrl ? (
            <img src={record.artworkUrl} alt={record.album} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Disc3 className="w-12 h-12 text-[var(--accent)]/30 mb-2" />
              <span className="text-[10px] font-mono text-white/30 text-center uppercase break-all">{record.album}</span>
            </div>
          )}
          {/* Record Sleeve highlight/shading */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Mechanical Selection Indicator */}
      {selectionMode && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-colors flex items-center justify-center">
           {isSelectedForShare ? (
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
           ) : (
             <div className="w-1 h-1 rounded-full bg-white/10" />
           )}
        </div>
      )}

      {/* Album Info */}
      <div className="mt-4 flex flex-col px-1 z-10 transition-opacity" style={{ opacity: isSelected ? 1 : 0.85 }}>
        <h3 className="font-serif text-[16px] leading-snug font-medium tracking-tight text-white/90 truncate">
          {record.album}
        </h3>
        <p className="font-kissa-chassis text-[9.5px] uppercase tracking-[0.15em] mt-1 text-white/40 truncate">
          {record.artist}
        </p>
      </div>
    </div>
  )
})
RecordItem.displayName = 'RecordItem'
