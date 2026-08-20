import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import albumPlaceholder from '@renderer/media/placeholder-album.png'

export interface AlbumSleeveProps {
  artworkUrl?: string
  title?: string
  className?: string
}

export const AlbumSleeve = memo(({ artworkUrl, title, className }: AlbumSleeveProps) => {
  const artwork = artworkUrl || albumPlaceholder

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        'relative group select-none pointer-events-auto',
        'transform -rotate-1 hover:rotate-0 transition-transform duration-500 ease-out',
        className
      )}
    >
      {/* Studio directional floor shadow */}
      <div className="absolute inset-0 translate-x-4 translate-y-6 rounded-md bg-black/90 blur-xl opacity-85 transition-all duration-500 group-hover:translate-x-6 group-hover:translate-y-8" />
      <div className="absolute inset-0 translate-x-1 translate-y-2 rounded-md bg-black/95 blur-xs opacity-90" />

      {/* Main Physical Gatefold Jacket */}
      <div className="relative flex aspect-square w-full flex-col overflow-hidden rounded-[4px] border border-white/8 bg-[#161619] shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
        {/* Album Artwork Image */}
        <img
          src={artwork}
          alt={title || 'Album cover'}
          className="h-full w-full object-cover rounded-[3px]"
          onError={(e) => {
            e.currentTarget.src = albumPlaceholder
          }}
        />

        {/* Paper Sheen Overlay (Top-Left Studio Keylight) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/40" />

        {/* Gatefold Cardstock Spine Edge (Left Side Depth) */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-3 bg-gradient-to-r from-black/80 via-black/30 to-transparent border-r border-white/5" />

        {/* Top/Right Cardstock Edge Highlights */}
        <div className="pointer-events-none absolute inset-0 rounded-[4px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_inset_-1px_0_1px_rgba(0,0,0,0.5)]" />
      </div>
    </motion.div>
  )
})

AlbumSleeve.displayName = 'AlbumSleeve'
