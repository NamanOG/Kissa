import React, { useEffect, useState, useRef } from 'react'
import { SharePayload, AlbumShareData, StatsShareData } from '../../../../types/share'
import { extractColorsFromImage, AdaptivePalette } from '../../hooks/useAdaptiveColor'
import { cn } from '../../utils/cn'
import { usePlayerStore } from '../../stores/playerStore'
import { possessive } from '../../utils/greeting'

const Label = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <span className="font-mono text-[15px] uppercase tracking-[0.22em] opacity-55">{children}</span>
)

const Cover = ({ src, size }: { src?: string; size: number }): React.JSX.Element => (
  <div
    className="shrink-0 overflow-hidden rounded-[6px] bg-black/40 shadow-[0_30px_70px_rgba(0,0,0,0.55)]"
    style={{ width: size, height: size }}
  >
    {src && <img src={src} className="h-full w-full object-cover" alt="" />}
  </div>
)

const Fact = ({ label, value }: { label: string; value: string }): React.JSX.Element => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    <span className="font-serif text-[40px] leading-none">{value}</span>
  </div>
)

export interface ShareCardRendererProps {
  payload: SharePayload
  isExport?: boolean
}

export function ShareCardRenderer({ payload, isExport = false }: ShareCardRendererProps) {
  const [palette, setPalette] = useState<AdaptivePalette | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listenerName = usePlayerStore((s) => s.listenerName)

  const { type, data, aspectRatio } = payload

  let primaryArtwork = ''
  if (type === 'album') {
    primaryArtwork = (data as AlbumShareData).artworkUrl || ''
  } else if (type === 'collection') {
    const arr = data as AlbumShareData[]
    primaryArtwork = arr[0]?.artworkUrl || ''
  } else if (type === 'stats') {
    primaryArtwork = (data as StatsShareData).mostPlayedAlbum?.artworkUrl || ''
  }

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

  const isSquare = aspectRatio === '1:1'
  const ink = palette?.onSurface ?? '#f5efe6'
  const accent = palette?.accent ?? '#d98a4a'
  const owner = possessive(listenerName)
  const monthYear = (time: number): string =>
    new Date(time).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

  const renderAlbum = (): React.JSX.Element => {
    const album = data as AlbumShareData
    return (
      <div className="relative z-10 flex flex-1 flex-col justify-between">
        <div className="flex justify-center">
          <Cover src={album.artworkUrl} size={isSquare ? 560 : 800} />
        </div>
        <div>
          <h1 className="font-serif text-[76px] font-medium leading-[1.02] tracking-[-0.02em] line-clamp-2">
            {album.album}
          </h1>
          <p className="mt-4 font-serif text-[38px] italic opacity-75 line-clamp-1">{album.artist}</p>
          <div className="mt-10 flex gap-20 border-t pt-8" style={{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
            <Fact label="Played" value={plural(album.playCount, 'time')} />
            <Fact label="First played" value={monthYear(album.firstListened)} />
          </div>
        </div>
      </div>
    )
  }

  const renderCollection = (): React.JSX.Element => {
    const albums = data as AlbumShareData[]
    const columns = albums.length <= 1 ? 1 : albums.length <= 4 ? 2 : 3
    const size = columns === 1 ? 640 : columns === 2 ? (isSquare ? 330 : 440) : isSquare ? 240 : 290
    return (
      <div className="relative z-10 flex flex-1 flex-col">
        <h1 className="font-serif text-[64px] font-medium leading-none tracking-[-0.02em]">
          {owner ? `${owner} records` : 'From the shelf'}
        </h1>
        <p className="mt-4">
          <Label>{plural(albums.length, 'album')}</Label>
        </p>
        <div className="flex flex-1 items-center justify-center">
          <div className="grid gap-x-8 gap-y-9" style={{ gridTemplateColumns: `repeat(${columns}, ${size}px)` }}>
            {albums.map((a, i) => (
              <div key={i} className="min-w-0">
                <Cover src={a.artworkUrl} size={size} />
                <p className="mt-4 truncate font-serif text-[24px] leading-tight">{a.album}</p>
                <p className="mt-1 truncate font-serif text-[19px] italic opacity-65">{a.artist}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderStats = (): React.JSX.Element => {
    const stats = data as StatsShareData
    const top = stats.mostPlayedAlbum
    return (
      <div className="relative z-10 flex flex-1 flex-col justify-between">
        <div>
          <Label>{owner ? `${owner} listening` : 'Listening'} · since {monthYear(stats.firstListenDate)}</Label>
          <div className="mt-6 flex items-end gap-6">
            <span
              className="font-serif font-medium leading-[0.82] tracking-[-0.04em]"
              style={{ fontSize: isSquare ? 260 : 340, color: accent }}
            >
              {stats.totalAlbums}
            </span>
            <span className="pb-4 font-serif text-[64px] italic leading-none">
              {stats.totalAlbums === 1 ? 'record' : 'records'}
            </span>
          </div>
          <div className="mt-12 flex gap-20 border-t pt-8" style={{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
            <Fact label="Artists" value={String(stats.uniqueArtists)} />
            <Fact label="Plays" value={String(stats.totalPlays)} />
          </div>
        </div>

        {top && (
          <div className="flex items-end gap-10">
            <Cover src={top.artworkUrl} size={isSquare ? 250 : 340} />
            <div className="min-w-0 pb-2">
              <Label>Most played</Label>
              <h2 className="mt-4 font-serif text-[52px] font-medium leading-[1.04] tracking-[-0.015em] line-clamp-2">
                {top.album}
              </h2>
              <p className="mt-3 font-serif text-[30px] italic opacity-75 line-clamp-1">{top.artist}</p>
              <p className="mt-5">
                <Label>{plural(top.playCount, 'play')}</Label>
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col overflow-hidden p-[84px]', isSquare ? 'h-[1080px] w-[1080px]' : 'h-[1350px] w-[1080px]')}
      style={{ backgroundColor: palette?.deckBg ?? '#12100d', color: ink }}
    >
      {/* One soft light, taken from the cover. No frames, no vignette. */}
      {palette && (
        <div
          className="pointer-events-none absolute -left-[20%] -top-[30%] h-[90%] w-[110%] rounded-full opacity-25"
          style={{ background: `radial-gradient(closest-side, ${palette.ambientPrimary} 0%, transparent 100%)` }}
        />
      )}

      {type === 'album' && renderAlbum()}
      {type === 'collection' && renderCollection()}
      {type === 'stats' && renderStats()}

      <div className="relative z-10 mt-12 flex items-baseline justify-between">
        <span className="font-serif text-[30px] italic">Kissa</span>
        <Label>{monthYear(Date.now())}</Label>
      </div>
    </div>
  )
}
