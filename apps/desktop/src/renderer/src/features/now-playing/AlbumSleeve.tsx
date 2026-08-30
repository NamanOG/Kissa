import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import albumPlaceholder from '@renderer/media/placeholder-album.png'

export interface AlbumSleeveProps {
  artworkUrl?: string
  title?: string
  className?: string
  flat?: boolean
}

export const AlbumSleeve = memo(({ artworkUrl, title, className, flat = false }: AlbumSleeveProps) => {
  const artwork = artworkUrl || albumPlaceholder

  return (
    <motion.div
      initial={flat ? false : { scale: 0.95, opacity: 0, rotateX: 2, rotateY: -4, rotateZ: -1 }}
      animate={flat ? undefined : { scale: 1, opacity: 1, rotateX: 2, rotateY: -4, rotateZ: -1 }}
      whileHover={flat ? undefined : { scale: 1.015, rotateX: 1, rotateY: -2, rotateZ: -0.5 }}
      transition={flat ? undefined : { duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      style={flat ? undefined : { perspective: 1200, transformStyle: 'preserve-3d' }}
      className={cn(
        'relative group select-none pointer-events-auto',
        flat ? 'transform-none' : '',
        className
      )}
    >
      {/* Physical ambient contact shadow & floor falloff */}
      <div className="absolute inset-0 translate-y-3 rounded-[2px] bg-black/80 blur-xl opacity-90 transition-transform duration-content ease-primary" />
      <div className="absolute inset-0 translate-y-1 rounded-[2px] bg-black/90 blur-sm opacity-95" />

      {/* Main Physical 12" Vinyl Cardstock Jacket */}
      <div className="relative flex aspect-square w-full flex-col overflow-hidden rounded-[2px] border border-white/[0.06] bg-[#121214] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85),_0_8px_16px_-4px_rgba(0,0,0,0.65)]">
        {/* Album Artwork Image */}
        <img
          src={artwork}
          alt={title || 'Album cover'}
          className="h-full w-full object-cover rounded-[1.5px]"
          onError={(e) => {
            e.currentTarget.src = albumPlaceholder
          }}
        />

        {/* Cardstock Fine Matte Sheen Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/25" />

        {/* Cardstock Seam Edge & Micro-Bevel Catchlights */}
        <div className="pointer-events-none absolute inset-0 rounded-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),_inset_0_-1px_0_rgba(0,0,0,0.4)]" />
      </div>
    </motion.div>
  )
})

AlbumSleeve.displayName = 'AlbumSleeve'
