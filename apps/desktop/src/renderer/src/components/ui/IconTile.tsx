import React from 'react'
import { cn } from '@renderer/utils/cn'
import { brandMarkSrc, brandMarkSrcSet } from '@renderer/utils/brandMark'

export type TileIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>

/** Tile colours, top to bottom. One set, so Settings and the guide light features alike. */
export const TILE = {
  graphite: ['#9aa0aa', '#4d535d'],
  amber: ['#f3b066', '#b5652a'],
  rose: ['#ff6f8a', '#cc2f52'],
  indigo: ['#8b86ff', '#4a41cf'],
  teal: ['#4fd1b5', '#1b8c74'],
  sky: ['#62b6ff', '#2b6fd0'],
  violet: ['#c784f5', '#8340c4'],
  olive: ['#b9c76a', '#6f7f2a'],
  ink: ['#2a221c', '#120e0b']
} as const satisfies Record<string, readonly [string, string]>

export type TileTint = readonly [string, string]

/**
 * A small rounded tile with an icon: quiet room-tinted glass, a hairline edge lit from above and
 * the glyph in the room's text colour. One look for every feature, so a list of settings reads as
 * one calm panel rather than a row of coloured app icons. (`tint` is kept for callers; the tiles
 * no longer take their own colours.) 'brand' shows Kissa's mark.
 */
export function IconTile({
  icon: Icon,
  size = 'sm'
}: {
  icon: TileIcon | 'brand'
  tint?: TileTint
  size?: 'sm' | 'lg'
}): React.JSX.Element {
  const large = size === 'lg'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden text-ink/80',
        'bg-[color-mix(in_srgb,var(--on-surface)_7%,transparent)]',
        'shadow-[inset_0_0_0_0.5px_color-mix(in_srgb,var(--on-surface)_16%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)]',
        large ? 'h-12 w-12 rounded-[13px]' : 'h-[30px] w-[30px] rounded-[8.5px]'
      )}
    >
      {Icon === 'brand' ? (
        <img
          src={brandMarkSrc}
          srcSet={brandMarkSrcSet}
          sizes={large ? '40px' : '26px'}
          alt=""
          draggable={false}
          className="h-[86%] w-[86%] rounded-full object-cover"
        />
      ) : (
        <Icon className={large ? 'h-[22px] w-[22px]' : 'h-4 w-4'} strokeWidth={1.75} />
      )}
    </span>
  )
}