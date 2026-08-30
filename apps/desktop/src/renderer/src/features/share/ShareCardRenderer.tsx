import React, { useEffect, useState, useRef } from 'react'
import { SharePayload, AlbumShareData, StatsShareData } from '../../../../types/share'
import { extractColorsFromImage, AdaptivePalette } from '../../hooks/useAdaptiveColor'
import { cn } from '../../utils/cn'

export interface ShareCardRendererProps {
  payload: SharePayload
  isExport?: boolean
}

export function ShareCardRenderer({ payload, isExport = false }: ShareCardRendererProps) {
  const [palette, setPalette] = useState<AdaptivePalette | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { type, data, aspectRatio } = payload

  // 1. Determine primary artwork to extract colors from
  let primaryArtwork = ''
  if (type === 'album') {
    primaryArtwork = (data as AlbumShareData).artworkUrl || ''
  } else if (type === 'collection') {
    const arr = data as AlbumShareData[]
    primaryArtwork = arr[0]?.artworkUrl || ''
  } else if (type === 'stats') {
    primaryArtwork = (data as StatsShareData).mostPlayedAlbum?.artworkUrl || ''
  }

  // 2. Extract colors and wait for images to load
  useEffect(() => {
    let mounted = true
    let colorsExtracted = false
    let imagesDone = false
    let readySignaled = false

    const checkReady = async () => {
      if (colorsExtracted && imagesDone && !readySignaled) {
        readySignaled = true
        if (isExport && window.electron?.sendShareReady) {
          try {
            await document.fonts.ready
          } catch (e) {
            console.warn('[Share] Fonts ready check failed', e)
          }
          // Add a tiny delay to ensure paint
          setTimeout(() => {
            if (mounted) window.electron?.sendShareReady(true)
          }, 300)
        }
        if (mounted) setImagesLoaded(true)
      }
    }

    if (primaryArtwork) {
      extractColorsFromImage(primaryArtwork)
        .then((p) => {
          if (mounted) {
            setPalette(p)
            colorsExtracted = true
            checkReady()
          }
        })
        .catch(() => {
          colorsExtracted = true
          checkReady()
        })
    } else {
      colorsExtracted = true
    }

    // Wait for DOM images
    if (containerRef.current) {
      const imgs = Array.from(containerRef.current.querySelectorAll('img'))
      if (imgs.length === 0) {
        imagesDone = true
        checkReady()
      } else {
        let loadedCount = 0
        imgs.forEach((img) => {
          if (img.complete) {
            loadedCount++
          } else {
            img.onload = () => {
              loadedCount++
              if (loadedCount === imgs.length) {
                imagesDone = true
                checkReady()
              }
            }
            img.onerror = () => {
              loadedCount++
              if (loadedCount === imgs.length) {
                imagesDone = true
                checkReady()
              }
            }
          }
        })
        if (loadedCount === imgs.length) {
          imagesDone = true
          checkReady()
        }
      }
    }

    return () => { mounted = false }
  }, [primaryArtwork, type, data, isExport])

  // Physical aesthetic styles using the extracted palette
  const wrapperStyle = palette ? {
    backgroundColor: palette.deckBg,
    color: palette.onSurface,
  } : {
    backgroundColor: '#111',
    color: '#fff',
  }

  const isSquare = aspectRatio === '1:1'
  const containerClass = cn(
    'relative overflow-hidden flex flex-col',
    isSquare ? 'w-[1080px] h-[1080px]' : 'w-[1080px] h-[1350px]'
  )

  const renderBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {palette && (
        <>
          {/* Subtle radial illumination behind artwork, no noise */}
          <div 
            className="absolute w-[150%] h-[150%] rounded-full opacity-[0.15]" 
            style={{ 
              background: `radial-gradient(circle, ${palette.ambientPrimary} 0%, transparent 70%)`,
              left: palette.spatialPrimaryX, 
              top: palette.spatialPrimaryY, 
              transform: 'translate(-50%, -50%)' 
            }} 
          />
          <div 
            className="absolute w-[100%] h-[100%] rounded-full opacity-[0.1]" 
            style={{ 
              background: `radial-gradient(circle, ${palette.ambientSecondary} 0%, transparent 70%)`,
              left: palette.spatialSecondaryX, 
              top: palette.spatialSecondaryY, 
              transform: 'translate(-50%, -50%)' 
            }} 
          />
        </>
      )}
      {/* Subtle vignette for contrast */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />
      {/* Archival borders */}
      <div className="absolute inset-6 border border-white/5 rounded-sm pointer-events-none" />
      <div className="absolute inset-8 border border-white/[0.02] rounded-sm pointer-events-none" />
    </div>
  )

  const renderBrand = () => (
    <div className="absolute bottom-12 left-12 right-12 z-20 flex items-center justify-between opacity-60">
      <span className="font-mono text-sm tracking-[0.4em] uppercase">Kissa</span>
      <span className="font-mono text-xs tracking-widest text-white/50">{new Date().getFullYear()} / Catalog</span>
    </div>
  )

  const renderAlbum = () => {
    const album = data as AlbumShareData
    return (
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-20">
        <div className="w-[600px] h-[600px] shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-sm overflow-hidden bg-[#111]">
          {album.artworkUrl && <img src={album.artworkUrl} className="w-full h-full object-cover" alt="" />}
        </div>
        <div className="mt-16 text-center max-w-[800px]">
          <h1 className="font-serif text-5xl font-medium tracking-tight mb-4">{album.album}</h1>
          <p className="font-mono text-xl tracking-widest opacity-70 uppercase">{album.artist}</p>
        </div>
        <div className="mt-12 flex gap-12 border-t border-white/10 pt-8 opacity-70">
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs tracking-[0.2em] uppercase mb-1">Play Count</span>
            <span className="font-serif text-2xl">{album.playCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs tracking-[0.2em] uppercase mb-1">First Listen</span>
            <span className="font-serif text-2xl">{new Date(album.firstListened).getFullYear()}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderCollection = () => {
    const albums = data as AlbumShareData[]
    const count = albums.length
    
    // Editorial layout logic
    let gridClass = 'grid-cols-2 gap-8'
    let imageSize = 'w-[320px] h-[320px]'
    if (count === 1) {
      gridClass = 'grid-cols-1'
      imageSize = 'w-[500px] h-[500px]'
    } else if (count >= 7) {
      gridClass = 'grid-cols-3 gap-6'
      imageSize = 'w-[240px] h-[240px]'
    } else if (count >= 4) {
      gridClass = 'grid-cols-2 gap-10'
      imageSize = 'w-[280px] h-[280px]'
    }

    return (
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-16 w-full">
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-16 opacity-90 absolute top-20 left-20">My Listening Room</h1>
        <div className={cn('grid w-full max-w-[840px] place-items-center', gridClass)}>
          {albums.map((a, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={cn("shadow-[0_24px_48px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-sm overflow-hidden bg-[#111]", imageSize)}>
                {a.artworkUrl && <img src={a.artworkUrl} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="mt-5 text-center px-4 w-full">
                <p className="font-serif text-lg leading-tight truncate">{a.album}</p>
                <p className="font-mono text-xs tracking-widest opacity-60 mt-1 uppercase truncate">{a.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderStats = () => {
    const stats = data as StatsShareData
    return (
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-20 w-full">
        <div className="absolute top-24 left-24 right-24 border-b border-white/20 pb-8 flex justify-between items-end">
          <h1 className="font-serif text-4xl font-medium tracking-tight">Listening Catalog</h1>
          <span className="font-mono text-sm tracking-widest opacity-60 uppercase">
            Est. {new Date(stats.firstListenDate).getFullYear()}
          </span>
        </div>

        <div className="flex w-full mt-32 gap-16">
          <div className="flex-1 flex flex-col gap-12">
            <div className="flex flex-col">
              <span className="font-mono text-xs tracking-[0.2em] uppercase opacity-50 mb-2">Total Albums</span>
              <span className="font-serif text-7xl font-medium">{stats.totalAlbums}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs tracking-[0.2em] uppercase opacity-50 mb-2">Unique Artists</span>
              <span className="font-serif text-7xl font-medium">{stats.uniqueArtists}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs tracking-[0.2em] uppercase opacity-50 mb-2">Total Plays</span>
              <span className="font-serif text-7xl font-medium">{stats.totalPlays}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-end border-l border-white/10 pl-16">
            {stats.mostPlayedAlbum && (
              <div className="flex flex-col items-end text-right">
                <span className="font-mono text-xs tracking-[0.2em] uppercase opacity-50 mb-6">Most Played</span>
                <div className="w-[300px] h-[300px] shadow-[0_32px_64px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-sm overflow-hidden bg-[#111]">
                  {stats.mostPlayedAlbum.artworkUrl && <img src={stats.mostPlayedAlbum.artworkUrl} className="w-full h-full object-cover" alt="" />}
                </div>
                <h3 className="font-serif text-2xl font-medium mt-6">{stats.mostPlayedAlbum.album}</h3>
                <p className="font-mono text-sm tracking-widest opacity-70 mt-2 uppercase">{stats.mostPlayedAlbum.artist}</p>
                <p className="font-mono text-xs opacity-50 mt-4">{stats.mostPlayedAlbum.playCount} Plays</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={containerClass} style={wrapperStyle}>
      {renderBackground()}
      {type === 'album' && renderAlbum()}
      {type === 'collection' && renderCollection()}
      {type === 'stats' && renderStats()}
      {renderBrand()}
    </div>
  )
}
