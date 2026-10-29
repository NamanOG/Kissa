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
 * A small rounded tile with an icon, lit in its own colour: a soft gradient, a gloss across the
 * top half, a hairline edge and a white glyph with a little depth. 'brand' shows Kissa's mark.
 */
export function IconTile({
  icon: Icon,
  tint,
  size = 'sm'
}: {
  icon: TileIcon | 'brand'
  tint: TileTint
  size?: 'sm' | 'lg'
}): React.JSX.Element {
  const large = size === 'lg'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden text-white',
        'shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.4),0_4px_10px_-2px_rgba(0,0,0,0.45)]',
        large ? 'h-12 w-12 rounded-[13px]' : 'h-[30px] w-[30px] rounded-[8.5px]'
      )}
      style={{ background: `linear-gradient(160deg, ${tint[0]} 0%, ${tint[1]} 100%)` }}
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
        <Icon
          className={cn('relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]', large ? 'h-[26px] w-[26px]' : 'h-[17px] w-[17px]')}
          strokeWidth={2}
        />
      )}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]" />
    </span>
  )
}
