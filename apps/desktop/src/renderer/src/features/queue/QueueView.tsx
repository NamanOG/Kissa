import React, { memo } from 'react'
import { motion, Reorder } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore, TrackInfo } from '@renderer/stores/playerStore'
import { Play, GripVertical, X } from 'lucide-react'
import albumPlaceholder from '@renderer/media/placeholder-album.png'

const QueueItem = memo(({
  track,
  index,
  isActive,

  onPlay,
  onRemove
}: {
  track: TrackInfo
  index: number
  isActive: boolean

  onPlay: () => void
  onRemove: () => void
}) => {
  return (
    <Reorder.Item
      value={track}
      className={cn(
        'group relative flex items-center gap-4 p-3 min-[900px]:p-4 rounded-2xl cursor-grab active:cursor-grabbing transition-colors transform-gpu',
        isActive
          ? 'bg-[var(--accent)]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'hover:bg-[var(--on-surface)]/[0.04]'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{
        scale: 1.02,
        boxShadow: 'var(--panel-shadow)',
        backgroundColor: 'var(--surface)',
        zIndex: 50
      }}
    >
      {/* Drag Handle */}
      <div className="shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)]">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Album Art with Play Overlay */}
      <div
        className="relative w-12 h-12 min-[900px]:w-14 min-[900px]:h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer shadow-sm"
        onClick={onPlay}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking play
      >
        <img
          src={track.artworkUrl || albumPlaceholder}
          alt={track.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-all bg-black/40',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {isActive ? (
            <div className="w-4 h-4 flex items-end justify-center gap-[2px]">
              <motion.div className="w-1 bg-white rounded-t-sm" animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
              <motion.div className="w-1 bg-white rounded-t-sm" animate={{ height: ['80%', '30%', '80%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear", delay: 0.2 }} />
              <motion.div className="w-1 bg-white rounded-t-sm" animate={{ height: ['60%', '100%', '60%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear", delay: 0.4 }} />
            </div>
          ) : (
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="flex flex-col min-w-0 flex-1 justify-center">
        <span
          className={cn(
            'font-serif text-lg min-[900px]:text-xl font-medium tracking-tight truncate',
            isActive ? 'text-[var(--accent)]' : 'text-[var(--on-surface)]'
          )}
        >
          {track.title}
        </span>
        <span
          className="text-xs min-[900px]:text-sm truncate mt-0.5 text-[var(--muted)] opacity-80"
        >
          {track.artist} &middot; {track.album}
        </span>
      </div>

      {/* Duration & Remove */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
          {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 hover:bg-[var(--on-surface)]/10 text-[var(--muted)] hover:text-[var(--on-surface)]"
          title="Remove from queue"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  )
})

QueueItem.displayName = 'QueueItem'

export const QueueView = memo(() => {
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const theme = usePlayerStore((s) => s.theme)
  
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const playTrackAtIndex = usePlayerStore((s) => s.playTrackAtIndex)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)

  if (queue.length === 0) {
    return (
      <motion.div
        key="queue-empty"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center h-full w-full select-none"
      >
        <div className="w-24 h-24 min-[900px]:w-32 min-[900px]:h-32 rounded-full mb-6 flex items-center justify-center opacity-50 bg-[var(--accent)]/10">
          <svg className="w-10 h-10 min-[900px]:w-14 min-[900px]:h-14 opacity-50 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl min-[900px]:text-3xl font-medium tracking-tight mb-2 text-[var(--on-surface)]">
          Up Next is Empty
        </h2>
        <p className="text-sm min-[900px]:text-base text-[var(--muted)]">
          Drag and drop tracks here to build your listening session.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="queue-view"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col h-full w-full p-6 min-[900px]:p-10 transform-gpu overflow-hidden max-w-4xl mx-auto"
    >
      <header className="flex items-center justify-between shrink-0 mb-6 min-[900px]:mb-10">
        <div>
          <h1 className="font-serif text-3xl min-[900px]:text-4xl font-medium tracking-tight text-[var(--on-surface)]">
            Up Next
          </h1>
          <p className="text-sm min-[900px]:text-base mt-1.5 text-[var(--muted)]">
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
        
        <button
          type="button"
          onClick={clearQueue}
          className="px-4 py-2 rounded-full text-xs font-mono tracking-widest uppercase transition-all active:scale-95 border border-[var(--on-surface)]/10 text-[var(--muted)] hover:bg-[var(--on-surface)]/5 hover:text-[var(--on-surface)]"
        >
          Clear
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-10">
        <Reorder.Group 
          axis="y" 
          values={queue} 
          onReorder={reorderQueue} 
          className="flex flex-col gap-2 min-[900px]:gap-3"
        >
          {queue.map((track, index) => (
            <QueueItem
              key={track.title + index} // A real app would use unique ID
              track={track}
              index={index}
              isActive={index === queueIndex}

              onPlay={() => playTrackAtIndex(index)}
              onRemove={() => removeFromQueue(index)}
            />
          ))}
        </Reorder.Group>
      </div>
    </motion.div>
  )
})

QueueView.displayName = 'QueueView'
