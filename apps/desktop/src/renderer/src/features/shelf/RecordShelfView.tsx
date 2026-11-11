import { SPRING_PANEL, SPRING_INDICATOR } from '@renderer/utils/motion'
import React, { memo, useEffect, useState, useMemo } from 'react'
import { AlbumOpenButton } from '@renderer/features/album/AlbumEntry'
import { motion, AnimatePresence } from 'framer-motion'
import { useShelfStore, RecordEntry } from '../../stores/shelfStore'
import { usePlayerStore } from '../../stores/playerStore'
import { possessive } from '../../utils/greeting'
import { Disc3, X, Share, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { SharePreviewModal } from '../share/SharePreviewModal'
import { SharePayload, StatsShareData, AlbumShareData } from '../../../../types/share'
import { RecordCrate } from './RecordCrate'
import { SavedLinesView } from './SavedLinesView'
import { compareTones, useCoverTones } from './coverTone'
import { useT } from '../../i18n'
import { usePressedStore } from '../wrap/pressedStore'
import { useSavedLinesStore } from '@renderer/stores/savedLinesStore'

type ShelfLayout = 'grid' | 'crate' | 'lines'
const LAYOUT_KEY = 'kissa_shelf_layout'

function readLayout(): ShelfLayout {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY)
    return saved === 'crate' || saved === 'lines' ? saved : 'grid'
  } catch {
    return 'grid'
  }
}

type SortOption = 'recent' | 'added' | 'played' | 'alpha' | 'colour'

export const RecordShelfView = memo(() => {
  const records = useShelfStore((s) => s.records)
  const clearShelf = useShelfStore((s) => s.clearShelf)
  // On the Lines view the count under the title is of the kept lines, not the records.
  const savedLineCount = useSavedLinesStore((s) => s.lines.length)
  const removeRecord = useShelfStore((s) => s.removeRecord)
  const [sort, setSort] = useState<SortOption>('recent')
  const t = useT()
  const listenerName = usePlayerStore((s) => s.listenerName)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  // Removing a record asks first, inside the panel; a new album starts without the question.
  const [confirmRemove, setConfirmRemove] = useState(false)
  useEffect(() => setConfirmRemove(false), [selectedAlbum])
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedForShare, setSelectedForShare] = useState<Set<string>>(new Set())
  const [layout, setLayoutState] = useState<ShelfLayout>(readLayout)
  const [crateKey, setCrateKey] = useState<string | null>(null)
  const setLayout = (next: ShelfLayout): void => {
    setLayoutState(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // Storage unavailable: the choice lasts for this visit.
    }
  }

  const toneItems = useMemo(() => records.map((r) => ({ key: r.albumKey, url: r.artworkUrl })), [records])
  const tones = useCoverTones(toneItems, sort === 'colour')

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
      case 'colour':
        return arr.sort((a, b) => compareTones(tones.get(a.albumKey), tones.get(b.albumKey)) || b.lastListened - a.lastListened)
      default:
        return arr
    }
  }, [records, sort, tones])

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
      className={cn(
        'relative flex flex-col h-full w-full transform-gpu overflow-hidden mx-auto',
        // With the album panel open the shelf and its toolbar make room for it: nothing is clipped under it.
        selectedAlbum && !selectionMode && 'pr-[392px] min-[1400px]:pr-[432px]'
      )}
    >
      <header className="shrink-0 mb-5 px-8 min-[1100px]:px-16 pt-8 min-[1100px]:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="truncate font-kissa-editorial text-[2rem] min-[900px]:text-[2.6rem] font-medium leading-[1.05] tracking-[-0.03em] text-ink">
              {listenerName.trim()
                ? t('shelf.titleNamed', { owner: possessive(listenerName), name: listenerName.trim() })
                : t('shelf.titleMine')}
            </h1>
            <p className="mt-2 text-[13px] text-dim">
              {layout === 'lines'
                ? t(savedLineCount === 1 ? 'shelf.linesCount.one' : 'shelf.linesCount.other', { n: savedLineCount })
                : t(records.length === 1 ? 'shelf.count.one' : 'shelf.count.other', { n: records.length })}
            </p>
          </div>
          {records.length > 0 && !selectionMode && (
            // Actions on the right of the title, on the count's line; the view controls get their own row.
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                data-tour="pressed"
                onClick={() => usePressedStore.getState().show('month', 0)}
                title={t('pressed.buttonHint')}
                className={cn(PILL, 'inline-flex items-center gap-2 pl-2.5')}
              >
                <Disc3 aria-hidden="true" className="h-4 w-4 stroke-[1.75] text-tone" />
                {t('pressed.button')}
              </button>
              <AlbumOpenButton quiet small label="album.folder" />
              {/* Selecting and clearing act on the records, so they are not offered over the saved lines. */}
              {layout !== 'lines' && (
                <button type="button" onClick={() => setSelectionMode(true)} className={PILL}>
                  {t('shelf.select')}
                </button>
              )}
              <button type="button" onClick={handleShareStats} className={PILL}>
                {t('shelf.shareStats')}
              </button>
              {layout !== 'lines' && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="ml-2 h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium text-dim transition-colors before:mr-3 before:inline-block before:h-3.5 before:w-px before:translate-y-[2px] before:bg-ink/15 before:content-[''] hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                >
                  {t('shelf.clear')}
                </button>
              )}
            </div>
          )}
        </div>

        {records.length > 0 && (
          <div className="mt-6 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-3">
            {!selectionMode ? (
              <>
                {layout !== 'lines' && (
                  <div role="group" aria-label={t('shelf.sort')} className={TRACK}>
                    <SortTab active={sort === 'recent'} onClick={() => setSort('recent')} label={t('shelf.sort.recent')} />
                    <SortTab active={sort === 'added'} onClick={() => setSort('added')} label={t('shelf.sort.added')} />
                    <SortTab active={sort === 'played'} onClick={() => setSort('played')} label={t('shelf.sort.played')} />
                    <SortTab active={sort === 'alpha'} onClick={() => setSort('alpha')} label={t('shelf.sort.alpha')} />
                    <SortTab active={sort === 'colour'} onClick={() => setSort('colour')} label={t('shelf.colour')} />
                  </div>
                )}
                {!selectionMode && (
                  <div role="radiogroup" aria-label={t('shelf.layout')} className={cn(TRACK, 'ml-auto shrink-0')}>
                    <SortTab active={layout === 'grid'} onClick={() => setLayout('grid')} label={t('shelf.grid')} radio indicator="layout-indicator" />
                    <SortTab active={layout === 'crate'} onClick={() => setLayout('crate')} label={t('shelf.crate')} radio indicator="layout-indicator" />
                    <SortTab active={layout === 'lines'} onClick={() => setLayout('lines')} label={t('shelf.lines')} radio indicator="layout-indicator" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex w-full items-center gap-3">
                <span className="text-[13px] font-medium text-ink/80" role="status">
                  {t('shelf.selected', { n: selectedForShare.size })}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode(false)
                      setSelectedForShare(new Set())
                    }}
                    className={PILL}
                  >
                    {t('shelf.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareCollection}
                    disabled={selectedForShare.size === 0}
                    className="h-8 cursor-pointer rounded-full bg-tone px-4 text-[12.5px] font-semibold text-[#170f09] transition-[filter] hover:brightness-110 disabled:cursor-default disabled:opacity-30"
                  >
                    {t('shelf.share')}
                  </button>
                </div>
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
              className="relative z-10 w-full max-w-[420px] kissa-sheet border border-white/[0.08] rounded-[24px] overflow-hidden flex flex-col p-6"
            >
              <h3 className="font-kissa-editorial text-[1.5rem] font-medium tracking-[-0.02em] text-ink mb-2">{t('shelf.clearTitle')}</h3>
              <p className="text-[14px] text-dim mb-6 leading-relaxed">
                {t('shelf.clearText')}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="h-9 px-4 rounded-full text-[13px] font-medium text-ink/80 hover:text-ink hover:bg-white/[0.08] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-tone"
                >
                  {t('shelf.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearShelf()
                    setShowClearConfirm(false)
                    setSelectedAlbum(null)
                  }}
                  // Destructive: red, as the system styles it, not the accent.
                  className="h-9 px-5 rounded-full bg-[#e5484d] text-white text-[13px] font-semibold hover:brightness-110 active:scale-[0.97] transition-[transform,filter] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#e5484d]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg)]"
                >
                  {t('shelf.clearConfirm')}
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
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink/90">
              {t('shelf.empty')}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-dim text-center max-w-xs">
            {t('shelf.emptyText')}
          </p>
          <div className="mt-5">
            <AlbumOpenButton quiet label="album.folder" />
          </div>
        </div>
      ) : layout === 'lines' && !selectionMode ? (
        <SavedLinesView />
      ) : layout === 'crate' && !selectionMode ? (
        <div className="flex-1 w-full min-h-0">
          <RecordCrate
            records={sortedRecords}
            currentKey={crateKey}
            onCurrentChange={setCrateKey}
            onOpen={(key) => setSelectedAlbum(key)}
          />
        </div>
      ) : (
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
          <div 
            className="grid gap-x-8 min-[1100px]:gap-x-12 gap-y-12 min-[1100px]:gap-y-16 px-8 min-[1100px]:px-16 pt-2 pb-32 max-w-[2400px] mx-auto w-full"
            // Columns come from the room available: three at the smallest window, more as it grows,
            // so covers stay record-sized instead of poster-sized.
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(170px, 100%), 1fr))' }}
          >
            <GridCards count={sortedRecords.length}>
              {(shown, settled) => (
                <AnimatePresence>
                  {sortedRecords.slice(0, shown).map((record) => (
                    <motion.div
                      // Layout animation (re-sorting) only once every card is in: while cards are
                      // still arriving, each batch would re-measure every card already shown.
                      layout={settled}
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
              )}
            </GridCards>
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
              transition={SPRING_PANEL}
              role="dialog"
              aria-label={t('shelf.by', { album: selectedRecord.album, artist: selectedRecord.artist })}
              // A floating sheet of the app's room-tinted glass, inset from the window's edges.
              className="absolute bottom-3 right-3 top-3 z-40 flex w-[380px] flex-col overflow-hidden rounded-[22px] border border-white/[0.08] kissa-sheet shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] min-[1400px]:w-[420px]"
            >
              {/* Lit by its own cover, like the record on the deck. */}
              {selectedRecord.artworkUrl && (
                <img
                  src={selectedRecord.artworkUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 left-1/2 h-[60%] w-[160%] -translate-x-1/2 object-cover opacity-25 blur-3xl"
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[var(--deck-bg)]/60 to-[var(--deck-bg)]/90" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setSelectedAlbum(null)}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-ink/[0.08] hover:text-ink cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
                aria-label={t('shelf.close')}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative flex-1 overflow-y-auto no-scrollbar px-7 pb-7 pt-14">
                <div className="aspect-square w-full max-w-[260px] overflow-hidden rounded-[14px] bg-[#1a1411] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
                  {selectedRecord.artworkUrl ? (
                    <img src={selectedRecord.artworkUrl} alt={selectedRecord.album} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Disc3 className="h-12 w-12 text-tone/30" />
                    </div>
                  )}
                </div>

                <h2 className="mt-6 font-kissa-editorial text-[22px] font-medium leading-[1.15] tracking-[-0.015em] text-ink text-balance">{selectedRecord.album}</h2>
                <p className="mt-1 text-[14px] text-dim">{selectedRecord.artist}</p>

                {/* The record's history as a quiet grouped list, like a settings screen. */}
                <dl className="mt-6 overflow-hidden rounded-[12px] bg-white/[0.045] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.06)]">
                  {[
                    [t('shelf.stat.plays'), String(selectedRecord.playCount)],
                    [t('shelf.stat.first'), shelfDate(selectedRecord.firstListened, t)],
                    [t('shelf.stat.last'), shelfDate(selectedRecord.lastListened, t)]
                  ].map(([label, value], i) => (
                    <div key={label} className={cn('flex items-baseline justify-between gap-4 px-4 py-2.5', i > 0 && 'shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]')}>
                      <dt className="text-[13px] text-dim">{label}</dt>
                      <dd className="text-[13px] font-medium tabular-nums text-ink/90">{value}</dd>
                    </div>
                  ))}
                </dl>

                {selectedRecord.tracksEncountered.length > 0 && (
                  <div className="mt-6">
                    <p className="px-1 text-[12px] font-medium text-dim">{t('shelf.songs')}</p>
                    <ol className="mt-2 overflow-hidden rounded-[12px] bg-white/[0.045] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.06)]">
                      {selectedRecord.tracksEncountered.map((song, i) => (
                        <li key={i} className={cn('flex items-baseline gap-3 px-4 py-2.5', i > 0 && 'shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]')}>
                          <span className="w-4 shrink-0 text-right text-[12px] tabular-nums text-dim/80">{i + 1}</span>
                          <span className="truncate text-[13.5px] text-ink/90">{song}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Actions follow the content: one calm primary action and a quiet remove. */}
                <div className="mt-6 flex items-center gap-2">
                  {confirmRemove ? (
                    <div className="flex w-full items-center gap-2" role="group" aria-label={t('shelf.removeAsk')}>
                      <p className="min-w-0 flex-1 text-[13px] text-ink/85">{t('shelf.removeAsk')}</p>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(false)}
                        className="h-8 rounded-full px-3 text-[12.5px] font-medium text-ink/75 transition-colors hover:bg-white/[0.08] hover:text-ink cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-tone"
                      >
                        {t('shelf.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRecord(selectedRecord.albumKey)
                          setConfirmRemove(false)
                          setSelectedAlbum(null)
                        }}
                        className="h-8 rounded-full bg-[#e5484d] px-3.5 text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-110 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#e5484d]/60"
                      >
                        {t('shelf.removeYes')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSharePayload({ type: 'album', data: selectedRecord as unknown as AlbumShareData, aspectRatio: '4:5' })
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-tone/[0.16] px-4 text-[13px] font-semibold text-tone transition-colors hover:bg-tone/[0.24] cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-tone"
                      >
                        <Share className="h-4 w-4" aria-hidden="true" />
                        {t('shelf.shareCard')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(true)}
                        className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-red-500/10 hover:text-red-300 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-tone"
                        aria-label={t('shelf.remove')}
                        title={t('shelf.remove')}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
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

/**
 * The grid's first screenful mounts at once and the rest follows a batch per frame. A shelf of 114
 * records mounted every card (each with layout animation) in one 230 ms task, measured in the live
 * app on 2026-11-10; in batches no single frame carries more than one batch. Mounted afresh each
 * time the grid opens, so returning to the grid is staged the same way.
 */
const GRID_FIRST = 12
const GRID_STEP = 6
function GridCards({ count, children }: { count: number; children: (shown: number, settled: boolean) => React.ReactNode }): React.JSX.Element {
  const [shown, setShown] = useState(() => Math.min(count, GRID_FIRST))
  useEffect(() => {
    if (shown >= count) return
    const id = requestAnimationFrame(() => setShown((n) => Math.min(count, n + GRID_STEP)))
    return () => cancelAnimationFrame(id)
  }, [shown, count])
  return <>{children(Math.min(shown, count), shown >= count)}</>
}

/** Today, yesterday, a date this year, or a date with the year. */
function shelfDate(time: number, t: (key: 'shelf.today' | 'shelf.yesterday') => string): string {
  const d = new Date(time)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return t('shelf.today')
  if (days === 1) return t('shelf.yesterday')
  return d.toLocaleDateString(undefined, d.getFullYear() === today.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

/** A recessed track holding a group of choices, like a native segmented control. */
const TRACK =
  'flex items-center gap-0.5 rounded-[11px] bg-black/25 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.04),0_1px_0_rgba(255,255,255,0.04)]'
/** A quiet text button for secondary actions: no outline, it fills only on hover. */
const PILL =
  'h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium text-ink/75 transition-colors hover:bg-white/[0.08] hover:text-ink outline-none focus-visible:ring-1 focus-visible:ring-tone'

function SortTab({ active, onClick, label, radio, indicator = 'sort-indicator' }: { active: boolean, onClick: () => void, label: string, radio?: boolean, indicator?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? active : undefined}
      aria-pressed={radio ? undefined : active}
      className="relative h-[28px] rounded-[8px] px-3 group cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-tone"
    >
      {active && (
        <motion.div
          layoutId={indicator}
          transition={SPRING_INDICATOR}
          className="absolute inset-0 rounded-[8px] bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(255,255,255,0.08))] shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(0,0,0,0.4),inset_0_0.5px_0_rgba(255,255,255,0.18)]"
        />
      )}
      <span className={cn(
        "relative text-[12.5px] font-medium tracking-[-0.005em] transition-colors duration-ui",
        active ? "text-ink" : "text-ink/55 group-hover:text-ink"
      )}>
        {label}
      </span>
    </button>
  )
}

const RecordItem = memo(({ record, isSelected, onClick, selectionMode, isSelectedForShare }: { record: RecordEntry, isSelected: boolean, onClick: () => void, selectionMode: boolean, isSelectedForShare: boolean }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlayingThisAlbum = currentTrack?.album?.toLowerCase() === record.album.toLowerCase() && 
                             currentTrack?.artist?.toLowerCase() === record.artist.toLowerCase()

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${record.album} by ${record.artist}`}
      aria-pressed={selectionMode ? isSelectedForShare : undefined}
      aria-expanded={selectionMode ? undefined : isSelected}
      className={cn(
        "flex flex-col relative group cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tone",
        isSelected ? "z-20" : "hover:z-20"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
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
                 <img src={record.artworkUrl} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80" alt="" />
              ) : (
                 <div className="w-full h-full bg-tone opacity-80" />
              )}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#e8e4db]" />
          </div>
        )}

        <div className="absolute inset-0 z-10 rounded-sm overflow-hidden bg-[#1a1411]">
          {record.artworkUrl ? (
            <img src={record.artworkUrl} alt={record.album} loading="lazy" decoding="async" className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Disc3 className="w-12 h-12 text-tone/30 mb-2" />
              <span className="font-kissa-editorial text-[14px] leading-snug text-white/50 text-center break-words">{record.album}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {selectionMode && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-colors flex items-center justify-center">
           {isSelectedForShare ? (
             <div className="w-1.5 h-1.5 rounded-full bg-tone" />
           ) : (
             <div className="w-1 h-1 rounded-full bg-white/10" />
           )}
        </div>
      )}

      <div className="relative isolate mt-4 flex flex-col px-1 z-10">
        {/* A soft, static shade behind the words, so they stay readable over the brightest rooms
            (a plain gradient: no blur for a hundred cards to recompute). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-4 -inset-y-3 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.34),transparent_72%)]"
        />
        <h3 className="font-serif text-[16px] leading-snug font-medium tracking-tight text-ink truncate">
          {record.album}
        </h3>
        <p className="mt-1 text-[13px] text-ink/70 truncate">
          {record.artist}
        </p>
      </div>
    </div>
  )
})
RecordItem.displayName = 'RecordItem'
