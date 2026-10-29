import { memo, useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { useT } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { useSidesStore } from './sidesStore'
import { sideSourceKeys } from './sides'

/**
 * A thin meter for the side playing: one segment per track, filled as the side plays, with the
 * side's letter and where on it you are.
 */
export const SideMeter = memo(({ className }: { className?: string }) => {
  const t = useT()
  const sides = useSidesStore((s) => s.sides)
  const place = useSidesStore((s) => s.place)
  const fillRef = useRef<HTMLDivElement>(null)
  const side = sides && place ? sides.sides[place.side] : null

  useEffect(() => {
    if (!side || !place) return
    const tracks = side.tracks
    const known = tracks.every((tr) => tr.length > 0)
    const weights = known ? tracks.map((tr) => tr.length) : tracks.map(() => 1)
    const total = weights.reduce((a, b) => a + b, 0)
    const before = weights.slice(0, place.track).reduce((a, b) => a + b, 0)
    const update = (): void => {
      const dur = usePlayerStore.getState().currentTrack?.duration ?? 0
      const into = dur > 0 ? Math.max(0, Math.min(1, PlaybackClock.getCurrentTime() / dur)) : 0
      const ratio = (before + into * weights[place.track]) / total
      if (fillRef.current)
        fillRef.current.style.clipPath = `inset(0 ${((1 - ratio) * 100).toFixed(2)}% 0 0)`
    }
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [side, place])

  if (!side || !place || !sides) return null
  const source = sideSourceKeys(sides.kind)
  const tracks = side.tracks
  const known = tracks.every((tr) => tr.length > 0)
  const segments = (
    <>
      {tracks.map((tr, i) => (
        <div key={i} className="h-full rounded-full" style={{ flex: known ? tr.length : 1 }} />
      ))}
    </>
  )

  return (
    <button
      type="button"
      className={cn(
        'group/meter -mx-2 -my-1.5 block rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
        className
      )}
      data-testid="side-meter"
      aria-label={`${t('sides.side', { letter: side.letter })}, ${t('sides.of', { n: place.track + 1, total: side.tracks.length })}. ${t(source.note)} ${t('sleeve.back')}`}
      title={t(source.note)}
      onClick={() => useSidesStore.setState((s) => ({ sleeveTurned: !s.sleeveTurned }))}
    >
      <div className="flex items-baseline gap-2 text-[12px]">
        <span className="font-medium text-ink/85">{t('sides.side', { letter: side.letter })}</span>
        <span className="tabular-nums text-dim">
          {t('sides.of', { n: place.track + 1, total: tracks.length })}
        </span>
        <span aria-hidden="true" className="text-ink/30">
          ·
        </span>
        <span className="text-dim" data-testid="meter-source">
          {t(source.label)}
        </span>
      </div>
      <div className="relative mt-2 h-[3px] w-[236px]">
        <div className="absolute inset-0 flex gap-[3px] [&>div]:bg-white/[0.12]">{segments}</div>
        <div
          ref={fillRef}
          className="absolute inset-0 flex gap-[3px] [&>div]:bg-tone"
          // No transition: a clip-path that keeps animating repaints the whole window on every
          // frame, and across a side the fill moves well under a pixel a second anyway.
          style={{ clipPath: 'inset(0 100% 0 0)' }}
        >
          {segments}
        </div>
      </div>
    </button>
  )
})

SideMeter.displayName = 'SideMeter'
