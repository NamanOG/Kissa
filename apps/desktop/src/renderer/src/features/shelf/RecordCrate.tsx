import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Disc3 } from 'lucide-react'
import type { RecordEntry } from '@renderer/stores/shelfStore'
import { cn } from '@renderer/utils/cn'
import { useT } from '@renderer/i18n'
import { useCrateThumb } from './crateThumbs'

/** How many sleeves either side of the current one are drawn. The rest are not mounted. */
export const CRATE_RADIUS = 7

/** The slice of the collection to mount around the current record. */
export function crateWindow(count: number, index: number, radius = CRATE_RADIUS): [number, number] {
  if (count <= 0) return [0, 0]
  const i = Math.min(Math.max(index, 0), count - 1)
  return [Math.max(0, i - radius), Math.min(count, i + radius + 1)]
}

/** Where a key moves the current record to, or null when the key is not for the crate. */
export function crateKeyTarget(key: string, index: number, count: number): number | null {
  const last = count - 1
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(last, index + 1)
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(0, index - 1)
    case 'PageDown':
      return Math.min(last, index + 10)
    case 'PageUp':
      return Math.max(0, index - 10)
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/** The record's centre label: the cover, small. */
function CrateLabel({ url }: { url: string }): React.JSX.Element {
  const src = useCrateThumb(url)
  return <span className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
}

/** A cover at crate size (see crateThumbs.ts). */
function CrateCover({ url }: { url: string }): React.JSX.Element {
  const src = useCrateThumb(url)
  return <img src={src} alt="" decoding="async" draggable={false} className="h-full w-full object-cover" />
}

interface RecordCrateProps {
  records: RecordEntry[]
  /** Opens the existing album details. */
  onOpen: (albumKey: string) => void
  /** Kept by the shelf so the place in the crate survives opening details or re-sorting. */
  currentKey: string | null
  onCurrentChange: (albumKey: string) => void
}

/**
 * Record Crate: the collection as a record-shop wall you flip through (Cover Flow). The current
 * sleeve faces you with its record sliding half out; the sleeves either side stand angled and
 * overlapping, many at once, on a glossy floor that reflects them. Drag, scroll, use the arrow
 * keys or click any sleeve to bring it forward; click the front one (or Enter) to open it. Its
 * name is printed in full below. Only the sleeves near the current one are mounted.
 */
export const RecordCrate = memo(({ records, onOpen, currentKey, onCurrentChange }: RecordCrateProps): React.JSX.Element => {
  const t = useT()
  const found = records.findIndex((r) => r.albumKey === currentKey)
  const index = found >= 0 ? found : 0
  const current = records[index]
  const [start, end] = crateWindow(records.length, index)
  const crateRef = useRef<HTMLDivElement>(null)
  const wheelAcc = useRef(0)
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const go = useCallback(
    (i: number) => {
      const r = records[Math.min(Math.max(i, 0), records.length - 1)]
      if (r) onCurrentChange(r.albumKey)
    },
    [records, onCurrentChange]
  )

  // A collection that no longer has the remembered record starts at the first one.
  useEffect(() => {
    if (current && current.albumKey !== currentKey) onCurrentChange(current.albumKey)
  }, [current, currentKey, onCurrentChange])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (current) onOpen(current.albumKey)
      return
    }
    const target = crateKeyTarget(e.key, index, records.length)
    if (target !== null) {
      e.preventDefault()
      go(target)
    }
  }

  // The wheel flips one sleeve per notch, whichever way the wheel or trackpad moves.
  useEffect(() => {
    const el = crateRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      e.preventDefault()
      wheelAcc.current += delta
      if (Math.abs(wheelAcc.current) >= 60) {
        const step = wheelAcc.current > 0 ? 1 : -1
        wheelAcc.current = 0
        go(index + step)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [go, index])

  // The wall is laid out in pixels from the space it is given.
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = crateRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const S = Math.max(80, Math.min((box.h || 340) * 0.66, 320)) // front sleeve size
  const STEP = S * 0.3 // spacing between angled sleeves

  // Dragging sideways flips through the wall: one sleeve per STEP of travel, against the drag.
  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, from: index, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    if (d.moved) go(d.from - Math.round(dx / STEP))
  }
  const endDrag = (): void => {
    // A drag is not a click: keep the sleeve under the pointer from opening.
    const d = drag.current
    drag.current = null
    if (d?.moved) suppressClick.current = true
  }
  const suppressClick = useRef(false)

  const sleeves = useMemo(() => records.slice(start, end).map((r, k) => ({ r, i: start + k })), [records, start, end])

  if (!current) return <></>

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 pt-2 pb-6">
      <div
        ref={crateRef}
        role="listbox"
        tabIndex={0}
        aria-label={t('crate.label')}
        aria-activedescendant={`crate-${index}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative min-h-[180px] max-h-[420px] flex-1 w-full touch-pan-y select-none overflow-hidden outline-none focus-visible:[&_[data-current=true]_[data-sleeve]]:outline focus-visible:[&_[data-current=true]_[data-sleeve]]:outline-1 focus-visible:[&_[data-current=true]_[data-sleeve]]:outline-offset-4 focus-visible:[&_[data-current=true]_[data-sleeve]]:outline-ink/70"
        style={{ perspective: '1100px', perspectiveOrigin: '50% 40%' }}
      >
        {/* The shop floor: a faint sheen the sleeves stand on and reflect in. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-[radial-gradient(ellipse_55%_100%_at_50%_0%,rgba(255,235,210,0.045),transparent_70%)]" />
        {sleeves.map(({ r, i }) => {
          const offset = i - index
          const distance = Math.abs(offset)
          const isCurrent = offset === 0
          const side = Math.sign(offset)
          // The front sleeve sits a little left so its record can slide out to the right; the
          // first sleeve on the right leaves room for that record.
          const x = isCurrent ? -S * 0.16 : side * (S * (side > 0 ? 0.92 : 0.66) + (distance - 1) * STEP)
          const lifted = !isCurrent && hovered === i ? -S * 0.04 : 0
          return (
            <button
              key={r.albumKey}
              id={`crate-${i}`}
              type="button"
              role="option"
              aria-selected={isCurrent}
              aria-label={t('crate.item', { album: r.album, artist: r.artist })}
              tabIndex={-1}
              data-current={isCurrent}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false
                  return
                }
                if (isCurrent) onOpen(r.albumKey)
                else go(i)
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              className="absolute bottom-[30%] left-1/2 cursor-pointer outline-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none [will-change:transform]"
              style={{
                width: S,
                height: S,
                marginLeft: -S / 2,
                transformStyle: 'preserve-3d',
                transform: `translateX(${x}px) translateY(${lifted}px) translateZ(${isCurrent ? S * 0.08 : -S * 0.55}px) rotateY(${isCurrent ? 0 : -side * 58}deg)`,
                zIndex: 100 - distance
              }}
            >
              {/* The record, sliding half out of the front sleeve. */}
              <span
                aria-hidden="true"
                className="absolute left-[3%] top-[3%] h-[94%] w-[94%] rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.55)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{
                  background:
                    'repeating-radial-gradient(circle, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px), radial-gradient(circle, #2a2a2a 0 17%, #0b0b0b 17.5% 100%)',
                  transform: isCurrent ? `translateX(${S * 0.36}px) rotate(20deg)` : 'none',
                  opacity: isCurrent ? 1 : 0
                }}
              >
                {r.artworkUrl && (
                  <CrateLabel url={r.artworkUrl} />
                )}
              </span>
              <span
                data-sleeve
                className={cn('absolute inset-0 overflow-hidden rounded-[3px] bg-[#1a1411]', isCurrent ? 'shadow-[0_22px_48px_rgba(0,0,0,0.7)] [-webkit-box-reflect:below_3px_linear-gradient(transparent_62%,rgba(0,0,0,0.26))]' : 'shadow-[0_6px_14px_rgba(0,0,0,0.45)]')}
              >
                {r.artworkUrl ? (
                  <CrateCover url={r.artworkUrl} />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
                    <Disc3 className="h-10 w-10 text-tone/30" />
                    <span className="line-clamp-3 text-center font-kissa-editorial text-[15px] leading-snug text-white/50">{r.album}</span>
                  </span>
                )}
                {/* Sleeves further out sit in shadow. */}
                <span aria-hidden="true" className="absolute inset-0 bg-black transition-opacity duration-500 motion-reduce:transition-none" style={{ opacity: isCurrent ? 0 : Math.min(0.6, 0.16 + distance * 0.06) }} />
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-r from-white/25 to-transparent" />
              </span>
            </button>
          )
        })}
      </div>

      {/* The wall takes the height the details leave; the details never shrink. */}
      <div className="flex w-full max-w-[560px] shrink-0 flex-col items-center text-center">
        <p className="text-[12.5px] tabular-nums text-dim" aria-live="polite">
          {t('crate.count', { n: index + 1, total: records.length })}
        </p>
        <h2 className="mt-[calc(0.5rem-0.14em)] pt-[0.14em] line-clamp-2 font-kissa-editorial text-[26px] leading-[1.12] text-ink text-balance">{current.album}</h2>
        <p className="mt-1.5 line-clamp-1 text-[14px] text-ink/70">{current.artist}</p>
        <p className="mt-2 text-[12px] text-dim">
          {current.playCount} {t(current.playCount === 1 ? 'shelf.play.one' : 'shelf.play.other')}
        </p>
        <div className="mt-5 flex w-full items-center gap-5">
          {/* A ruler of the records, one tick each (sampled for big collections), with the current
              record marked. The native range input sits over it, invisible, for dragging,
              keyboard and screen readers. */}
          <div className="relative h-7 flex-1">
            <div aria-hidden="true" className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between">
              {Array.from({ length: Math.min(records.length, 60) }, (_, t, all = Math.min(records.length, 60)) => {
                const at = all > 1 ? Math.round((t / (all - 1)) * (records.length - 1)) : 0
                const near = Math.abs(at - index) <= Math.max(1, Math.round(records.length / 60))
                return <span key={t} className={cn('w-px rounded-full transition-colors', near ? 'h-3 bg-ink/60' : 'h-2 bg-ink/20')} />
              })}
            </div>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tone shadow-[0_0_10px_var(--accent)] transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ left: `${records.length > 1 ? (index / (records.length - 1)) * 100 : 50}%` }}
            />
            <input
              type="range"
              min={0}
              max={Math.max(0, records.length - 1)}
              value={index}
              onChange={(e) => go(Number(e.target.value))}
              aria-label={t('crate.slider')}
              aria-valuetext={t('crate.position', { album: current.album, n: index + 1, total: records.length })}
              disabled={records.length < 2}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <span aria-hidden="true" className="pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md outline-1 outline-offset-2 outline-ink/70 peer-focus-visible:outline" />
          </div>
          <button
            type="button"
            onClick={() => onOpen(current.albumKey)}
            className="shrink-0 cursor-pointer rounded-md text-[12.5px] text-ink/85 underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink/70"
          >
            {t('crate.details')}
          </button>
        </div>
      </div>
    </div>
  )
})

RecordCrate.displayName = 'RecordCrate'
