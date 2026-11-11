import React, { useEffect, useState, useRef } from 'react'
import {
  SharePayload,
  AlbumShareData,
  StatsShareData,
  StudyShareData
} from '../../../../types/share'
import { environmentInfo } from '../study/scenes'
import { extractColorsFromImage, AdaptivePalette } from '../../hooks/useAdaptiveColor'
import { cn } from '../../utils/cn'
import { usePlayerStore } from '../../stores/playerStore'
import { possessive } from '../../utils/greeting'
import { useLanguageStore, useT } from '../../i18n'

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
  const t = useT()
  const language = useLanguageStore((s) => s.language)
  const savedName = usePlayerStore((s) => s.listenerName)
  const listenerName = payload.listenerName ?? savedName

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

    return () => {
      mounted = false
    }
  }, [primaryArtwork, type, data, isExport])

  const isSquare = aspectRatio === '1:1'
  const ink = palette?.onSurface ?? '#f5efe6'
  const accent = palette?.accent ?? '#d98a4a'
  const owner = possessive(listenerName)
  const monthYear = (time: number): string =>
    new Date(time).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-GB', { month: 'short', year: 'numeric' })
  const counted = (count: number, key: 'times' | 'albums' | 'playCount'): string =>
    t(`share.card.${key}.${count === 1 ? 'one' : 'other'}`, { n: count })

  const renderAlbum = (): React.JSX.Element => {
    const album = data as AlbumShareData
    return (
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* The cover takes whatever height the title, artist and facts leave, so a long title
            shrinks the cover instead of running underneath it. */}
        <div className="flex min-h-0 flex-1 justify-center pb-10">
          <div
            className="aspect-square h-full overflow-hidden rounded-[6px] bg-black/40 shadow-[0_30px_70px_rgba(0,0,0,0.55)]"
            style={{ maxHeight: isSquare ? 560 : 800, maxWidth: isSquare ? 560 : 800 }}
          >
            {album.artworkUrl && <img src={album.artworkUrl} className="h-full w-full object-cover" alt="" />}
          </div>
        </div>
        <div className="shrink-0">
          <h1 className="font-serif text-[76px] font-medium leading-[1.1] tracking-[-0.02em] line-clamp-2">
            {album.album}
          </h1>
          <p className="mt-4 font-serif text-[38px] opacity-75 line-clamp-1">{album.artist}</p>
          <div
            className="mt-10 flex gap-20 border-t pt-8"
            style={{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)' }}
          >
            <Fact label={t('share.card.played')} value={counted(album.playCount, 'times')} />
            <Fact label={t('share.card.firstPlayed')} value={monthYear(album.firstListened)} />
          </div>
        </div>
      </div>
    )
  }

  const renderStudy = (): React.JSX.Element => {
    const study = data as StudyShareData
    const room = environmentInfo(study.room)
    return (
      <div className="relative z-10 flex flex-1 flex-col justify-between gap-10">
        <div>
          <Label>{t('share.card.focusIn', { room: room.label })}</Label>
          <h1 className="mt-6 font-serif text-[100px] leading-none tracking-[-0.025em]">
            {t('share.card.focusMinutes', { n: study.focusMinutes })}
            <br />
            {t('share.card.ofFocus')}
          </h1>
        </div>
        <img
          src={room.photo}
          alt={t('share.card.roomPhoto', { room: room.label })}
          className="w-full rounded-md object-cover"
          style={{ height: isSquare ? 280 : 480 }}
        />
        <div className="flex items-end justify-between gap-12 border-t border-current/15 pt-8">
          {study.stepsTotal > 0 ? (
            <Fact label={t('share.card.stepsDone')} value={t('share.card.stepsOf', { done: study.stepsDone, total: study.stepsTotal })} />
          ) : (
            <Fact label={t('share.card.room')} value={room.label} />
          )}
          {study.record && (
            <div className="min-w-0 max-w-[560px] text-right">
              <Label>{t('share.card.onTurntable')}</Label>
              <p className="mt-4 font-serif text-[38px] leading-tight line-clamp-2">
                {study.record.album}
              </p>
              <p className="mt-2 text-[22px] opacity-65 truncate">{study.record.artist}</p>
            </div>
          )}
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
          {owner ? t('share.card.ownerRecords', { owner, name: listenerName ?? '' }) : t('share.card.fromShelf')}
        </h1>
        <p className="mt-4">
          <Label>{counted(albums.length, 'albums')}</Label>
        </p>
        <div className="flex flex-1 items-center justify-center">
          <div
            className="grid gap-x-8 gap-y-9"
            style={{ gridTemplateColumns: `repeat(${columns}, ${size}px)` }}
          >
            {albums.map((a, i) => (
              <div key={i} className="min-w-0">
                <Cover src={a.artworkUrl} size={size} />
                <p className="mt-4 truncate font-serif text-[24px] leading-tight">{a.album}</p>
                <p className="mt-1 truncate font-serif text-[19px] opacity-65">{a.artist}</p>
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
          <Label>
            {owner ? t('share.card.ownerListening', { owner, name: listenerName ?? '' }) : t('share.card.listening')} ·{' '}
                {t('share.card.since', { date: monthYear(stats.firstListenDate) })}
          </Label>
          <div className="mt-6 flex items-end gap-6">
            <span
              className="font-serif font-medium leading-[0.82] tracking-[-0.04em]"
              style={{
                fontSize: isSquare ? 260 : stats.runnersUp?.length ? 250 : 340,
                color: accent
              }}
            >
              {stats.totalAlbums}
            </span>
            <span className="pb-4 font-serif text-[64px] leading-none">
              {t(stats.totalAlbums === 1 ? 'share.card.records.one' : 'share.card.records.other')}
            </span>
          </div>
          <div
            className="mt-12 flex gap-16 border-t pt-8"
            style={{ borderColor: 'color-mix(in srgb, currentColor 16%, transparent)' }}
          >
            <Fact label={t('share.card.artists')} value={String(stats.uniqueArtists)} />
            <Fact label={t('share.card.plays')} value={String(stats.totalPlays)} />
            {stats.topArtist && (
              <div className="flex min-w-0 flex-col gap-2">
                <Label>{t('share.card.topArtist')}</Label>
                <span className="truncate font-serif text-[40px] leading-none">
                  {stats.topArtist.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {top && (
          <div>
            <div className="flex items-end gap-10">
              <Cover src={top.artworkUrl} size={isSquare ? 230 : 300} />
              <div className="min-w-0 pb-2">
                <Label>{t('share.card.mostPlayed')}</Label>
                <h2 className="mt-4 font-serif text-[50px] font-medium leading-[1.04] tracking-[-0.015em] line-clamp-2">
                  {top.album}
                </h2>
                <p className="mt-3 font-serif text-[30px] opacity-75 line-clamp-1">{top.artist}</p>
                <p className="mt-5">
                  <Label>{counted(top.playCount, 'playCount')}</Label>
                </p>
              </div>
            </div>
            {!isSquare && stats.runnersUp && stats.runnersUp.length > 0 && (
              <div className="mt-12">
                <Label>{t('share.card.alsoOn')}</Label>
                <div className="mt-5 grid grid-cols-4 gap-6">
                  {stats.runnersUp.slice(0, 4).map((a, i) => (
                    <div key={i} className="min-w-0">
                      <Cover src={a.artworkUrl} size={204} />
                      <p className="mt-3 truncate font-serif text-[22px] leading-tight">
                        {a.album}
                      </p>
                      <p className="mt-1 truncate font-mono text-[14px] uppercase tracking-[0.16em] opacity-55">
                        {counted(a.playCount, 'playCount')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col overflow-hidden p-[84px]',
        isSquare ? 'h-[1080px] w-[1080px]' : 'h-[1350px] w-[1080px]'
      )}
      style={{ backgroundColor: palette?.deckBg ?? '#12100d', color: ink }}
    >
      {/* One soft light, taken from the cover. No frames, no vignette. */}
      {palette && (
        <div
          className="pointer-events-none absolute -left-[20%] -top-[30%] h-[90%] w-[110%] rounded-full opacity-25"
          style={{
            background: `radial-gradient(closest-side, ${palette.ambientPrimary} 0%, transparent 100%)`
          }}
        />
      )}

      {type === 'album' && renderAlbum()}
      {type === 'collection' && renderCollection()}
      {type === 'stats' && renderStats()}
      {type === 'study' && renderStudy()}

      <div className="relative z-10 mt-12 flex items-baseline justify-between">
        <span className="flex items-baseline gap-5">
          <span className="font-serif text-[30px]">Kissa</span>
          <Label>{t('share.card.tagline')}</Label>
        </span>
        <Label>{monthYear(Date.now())}</Label>
      </div>
    </div>
  )
}
