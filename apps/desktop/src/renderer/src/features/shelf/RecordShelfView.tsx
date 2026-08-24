import React, { memo, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShelfStore, RecordEntry } from '../../stores/shelfStore'
import { usePlayerStore } from '../../stores/playerStore'
import { Play, Disc3, Clock, BarChart3, ArrowDownAZ } from 'lucide-react'
import { cn } from '../../utils/cn'

type SortOption = 'recent' | 'added' | 'played' | 'alpha'

export const RecordShelfView = memo(() => {
  const records = useShelfStore((s) => s.records)
  const [sort, setSort] = useState<SortOption>('recent')
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)

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

  return (
    <motion.div
      key="shelf-view"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col h-full w-full transform-gpu overflow-hidden mx-auto"
    >
      <header className="flex items-center justify-between shrink-0 mb-4 min-[900px]:mb-6 px-6 min-[900px]:px-10 pt-6 min-[900px]:pt-10">
        <div>
          <h1 className="font-serif text-3xl min-[900px]:text-4xl font-medium tracking-tight text-[var(--on-surface)] flex items-center gap-3">
            <Disc3 className="w-8 h-8 opacity-60" />
            My Records
          </h1>
          <p className="text-sm min-[900px]:text-base mt-1.5 text-[var(--muted)]">
            {records.length} {records.length === 1 ? 'record' : 'records'} in your collection
          </p>
        </div>
        
        {records.length > 0 && (
          <div className="flex bg-[var(--on-surface)]/5 rounded-full p-1 border border-[var(--on-surface)]/10">
            <SortButton active={sort === 'recent'} onClick={() => setSort('recent')} icon={<Clock className="w-3.5 h-3.5" />} label="Recent" />
            <SortButton active={sort === 'added'} onClick={() => setSort('added')} icon={<Disc3 className="w-3.5 h-3.5" />} label="Added" />
            <SortButton active={sort === 'played'} onClick={() => setSort('played')} icon={<BarChart3 className="w-3.5 h-3.5" />} label="Most Played" />
            <SortButton active={sort === 'alpha'} onClick={() => setSort('alpha')} icon={<ArrowDownAZ className="w-3.5 h-3.5" />} label="A-Z" />
          </div>
        )}
      </header>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 pb-32 select-none">
          <div className="w-24 h-24 min-[900px]:w-32 min-[900px]:h-32 rounded-full mb-6 flex items-center justify-center opacity-40 bg-[var(--accent)]/10">
            <Disc3 className="w-10 h-10 min-[900px]:w-14 min-[900px]:h-14 opacity-50 text-[var(--accent)]" strokeWidth={1} />
          </div>
          <h2 className="font-serif text-2xl min-[900px]:text-3xl font-medium tracking-tight mb-2 text-[var(--on-surface)]">
            Your shelf is empty.
          </h2>
          <p className="text-sm min-[900px]:text-base text-[var(--muted)] text-center max-w-sm">
            Records you listen to with Kissa will naturally appear here, building your personal collection over time.
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
          {/* Grid Layout for Albums */}
          <div className="grid grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1600px]:grid-cols-6 gap-x-6 gap-y-12 px-6 min-[900px]:px-10 pb-20">
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
                    onClick={() => setSelectedAlbum(selectedAlbum === record.albumKey ? null : record.albumKey)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  )
})

RecordShelfView.displayName = 'RecordShelfView'

function SortButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all",
        active 
          ? "bg-[var(--accent)] text-black shadow-[0_0_10px_var(--accent)]" 
          : "text-[var(--muted)] hover:text-[var(--on-surface)]"
      )}
    >
      {icon}
      <span className="hidden min-[1100px]:inline">{label}</span>
    </button>
  )
}

const RecordItem = memo(({ record, isSelected, onClick }: { record: RecordEntry, isSelected: boolean, onClick: () => void }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlayingThisAlbum = currentTrack?.album?.toLowerCase() === record.album.toLowerCase() && 
                             currentTrack?.artist?.toLowerCase() === record.artist.toLowerCase()

  return (
    <div className="flex flex-col relative group">
      {/* Album Cover / Sleeve */}
      <div 
        className={cn(
          "relative w-full aspect-square cursor-pointer transform-gpu transition-all duration-500 rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15),inset_1px_0_0_rgba(255,255,255,0.1)]",
          isSelected ? "scale-105 z-10 -translate-y-2" : "hover:scale-102 hover:-translate-y-1 group-hover:shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
        )}
        onClick={onClick}
      >
        {/* Record sticking out on hover/select */}
        <div 
          className={cn(
            "absolute top-1/2 -right-4 w-[90%] aspect-square rounded-full bg-[#111] -translate-y-1/2 transition-all duration-500 ease-out z-0 border border-white/5",
            "shadow-[-4px_0_12px_rgba(0,0,0,0.5)]",
            isSelected || isPlayingThisAlbum ? "translate-x-12 min-[900px]:translate-x-16 rotate-45" : "group-hover:translate-x-6 min-[900px]:group-hover:translate-x-8 group-hover:rotate-12",
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

      {/* Album Info */}
      <div className="mt-4 flex flex-col px-1 z-10 transition-opacity" style={{ opacity: isSelected ? 1 : 0.8 }}>
        <h3 className="font-serif text-[15px] font-medium tracking-tight text-[var(--on-surface)] truncate">
          {record.album}
        </h3>
        <p className="text-[12px] mt-0.5 text-[var(--muted)] truncate">
          {record.artist}
        </p>
      </div>

      {/* Expanded Tracks View */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="w-full pt-4 z-0 overflow-hidden"
          >
            <div className="text-[10px] uppercase font-mono tracking-widest text-[var(--muted)]/50 mb-2 px-1">
              Tracks encountered
            </div>
            <div className="flex flex-col gap-1">
              {record.tracksEncountered.map((t, i) => (
                <div key={i} className="text-[12.5px] px-2 py-1.5 rounded-md hover:bg-[var(--on-surface)]/5 text-[var(--on-surface)]/80 truncate flex items-center gap-2">
                  <Play className="w-3 h-3 opacity-30 shrink-0" />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-[var(--on-surface)]/10 flex justify-between px-1">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--muted)]/50">Plays</span>
                <span className="text-[11px] font-bold text-[var(--muted)]">{record.playCount}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--muted)]/50">Last Played</span>
                <span className="text-[11px] font-bold text-[var(--muted)]">{new Date(record.lastListened).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
RecordItem.displayName = 'RecordItem'
