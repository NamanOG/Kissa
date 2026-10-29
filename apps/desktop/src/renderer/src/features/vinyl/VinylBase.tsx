import { memo, useId } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylLayerProps } from './types'
import { usePlayerStore, type VinylColor } from '@renderer/stores/playerStore'
import { useAlbumPressing, type AlbumPressing } from './albumPressing'
import marbleTexture from '@renderer/media/editions/marble-green.jpg'
import oxbloodMarbleTexture from '@renderer/media/editions/marble-oxblood.jpg'
import midnightMarbleTexture from '@renderer/media/editions/marble-midnight.jpg'
import tortoiseTexture from '@renderer/media/editions/tortoise.jpg'
import splatterTexture from '@renderer/media/editions/splatter.jpg'
import { tl } from '@renderer/i18n'

export interface VinylPressing {
  name: string
  /** Centre and rim colour. Grooves and reflections sit on top. */
  inner: string
  outer: string
  /** Special pressings draw more than a plain gradient. */
  kind?: 'solid' | 'texture' | 'split'
  /** A textured pressing's image, made once offline (scripts/generate-edition-textures.ps1). */
  texture?: string
  /** A CSS background for small swatches (editor, settings). */
  swatch?: string
}

function textureSwatch(src: string): string {
  return `radial-gradient(circle, transparent 55%, rgba(0,0,0,0.45) 100%), url(${src}) center / cover`
}

/** Centre and rim colour of each pressing. Grooves and reflections sit on top of these. */
export const VINYL_PRESSINGS: Record<VinylColor, VinylPressing> = {
  black: { get name() { return tl('pressing.black') }, inner: '#1e1e1e', outer: '#0a0a0a' },
  oxblood: { get name() { return tl('pressing.oxblood') }, inner: '#641a1f', outer: '#2a090c' },
  amber: { get name() { return tl('pressing.amber') }, inner: '#a85c16', outer: '#4a2506' },
  forest: { get name() { return tl('pressing.forest') }, inner: '#22523a', outer: '#0c2217' },
  cobalt: { get name() { return tl('pressing.cobalt') }, inner: '#20468a', outer: '#0b1c3d' },
  smoke: { get name() { return tl('pressing.smoke') }, inner: '#55555a', outer: '#262628' },
  album: {
    // Drawn from the cover that is playing (useAlbumPressing); this is the fallback until then.
    get name() { return tl('pressing.album') },
    inner: '#1e1e1e',
    outer: '#0a0a0a',
    swatch: 'conic-gradient(from 30deg, #b8743a, #3f74a8, #a8406a, #6f9a52, #b8743a)'
  },
  match: {
    get name() { return tl('pressing.match') },
    inner: 'color-mix(in srgb, var(--accent) 64%, #000)',
    outer: 'color-mix(in srgb, var(--accent) 26%, #000)'
  },
  marble: {
    get name() { return tl('pressing.marble') },
    inner: '#1f4a35',
    outer: '#0b2016',
    kind: 'texture',
    texture: marbleTexture,
    swatch: textureSwatch(marbleTexture)
  },
  oxbloodMarble: {
    get name() { return tl('pressing.oxbloodMarble') },
    inner: '#561219',
    outer: '#1e0508',
    kind: 'texture',
    texture: oxbloodMarbleTexture,
    swatch: textureSwatch(oxbloodMarbleTexture)
  },
  midnightMarble: {
    get name() { return tl('pressing.midnightMarble') },
    inner: '#18284f',
    outer: '#070b1a',
    kind: 'texture',
    texture: midnightMarbleTexture,
    swatch: textureSwatch(midnightMarbleTexture)
  },
  tortoise: {
    get name() { return tl('pressing.tortoise') },
    inner: '#7a4214',
    outer: '#2a1406',
    kind: 'texture',
    texture: tortoiseTexture,
    swatch: textureSwatch(tortoiseTexture)
  },
  splatter: {
    get name() { return tl('pressing.splatter') },
    inner: '#2a2a2e',
    outer: '#141416',
    kind: 'texture',
    texture: splatterTexture,
    swatch: textureSwatch(splatterTexture)
  },
  split: {
    get name() { return tl('pressing.split') },
    inner: '#1c1c1c',
    outer: '#0a0a0a',
    kind: 'split',
    swatch: 'conic-gradient(from 20deg, #121212 0deg 180deg, #5a5a60 180deg 360deg)'
  }
}

/** A Match the Album plan as a pressing the record can draw. */
function asPressing(p: AlbumPressing): VinylPressing {
  switch (p.style) {
    case 'marble':
      return p.texture
        ? { name: p.name, inner: p.a, outer: p.b ?? p.a, kind: 'texture', texture: p.texture }
        : { name: p.name, inner: p.a, outer: `color-mix(in srgb, ${p.b ?? p.a} 45%, #000)` }
    case 'colour':
      return { name: p.name, inner: p.a, outer: `color-mix(in srgb, ${p.a} 38%, #000)` }
    case 'smoke':
      return VINYL_PRESSINGS.smoke
    default:
      return VINYL_PRESSINGS.black
  }
}

/** Pressings split for pickers: plain colours, then the special (textured or split) pressings. */
export function pressingGroups(colors: readonly VinylColor[]): { label: string; colors: VinylColor[] }[] {
  return [
    { label: tl('pressing.colours'), colors: colors.filter((c) => !VINYL_PRESSINGS[c]?.kind) },
    { label: tl('pressing.special'), colors: colors.filter((c) => Boolean(VINYL_PRESSINGS[c]?.kind)) }
  ]
}

/** A CSS background for a pressing's swatch. */
export function pressingSwatch(color: VinylColor): string {
  const p = VINYL_PRESSINGS[color] ?? VINYL_PRESSINGS.black
  return p.swatch ?? `radial-gradient(circle, ${p.inner} 0%, ${p.outer} 100%)`
}

export const VinylBase = memo(({ className, style, size = '100%', ...props }: VinylLayerProps) => {
  const color = usePlayerStore((s) => s.vinylColor)
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const album = useAlbumPressing(artworkUrl, color === 'album')
  const pressing = color === 'album' && album ? asPressing(album) : VINYL_PRESSINGS[color] ?? VINYL_PRESSINGS.black
  // Several records can be on screen at once (deck, mini player, Study Room): each needs
  // its own gradient ids.
  const uid = useId().replace(/:/g, '')
  const base = `vinyl-base-${uid}`
  const clip = `vinyl-clip-${uid}`

  return (
    <div className={cn('absolute', className)} style={{ width: size, height: size, ...style }} {...props}>
      <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={base} cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: pressing.inner }} />
            <stop offset="100%" style={{ stopColor: pressing.outer }} />
          </radialGradient>
          <clipPath id={clip}>
            <circle cx="50" cy="50" r="49.5" />
          </clipPath>
          {pressing.kind === 'split' && (
            <radialGradient id={`${base}-smoke`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6a6a70" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#3a3a3f" stopOpacity="0.92" />
            </radialGradient>
          )}
          {pressing.kind === 'texture' && (
            /* Pressed vinyl is darker and denser towards the rim. */
            <radialGradient id={`${base}-depth`} cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
            </radialGradient>
          )}
        </defs>

        <circle cx="50" cy="50" r="49.5" fill={`url(#${base})`} className="stroke-black stroke-[0.5px]" />

        {pressing.kind === 'split' && (
          <g clipPath={`url(#${clip})`} data-pressing="split">
            {/* Half translucent smoke, half black, with a soft seam where the two meet. */}
            <path d="M50 50 L 120 26 A 74 74 0 0 1 -20 74 Z" fill={`url(#${base}-smoke)`} />
            <path d="M50 50 L 120 26" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
            <path d="M50 50 L -20 74" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
          </g>
        )}

        {pressing.kind === 'texture' && (
          /*
           * A swirled marble pressing: a small static image made once, offline
           * (scripts/generate-edition-textures.ps1). It turns with the record inside the same
           * composited layer, so it is decoded once and costs nothing per frame.
           */
          <g clipPath={`url(#${clip})`} data-pressing={color}>
            <image href={pressing.texture} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
            <circle cx="50" cy="50" r="49.5" fill={`url(#${base}-depth)`} />
          </g>
        )}
      </svg>
    </div>
  )
})

VinylBase.displayName = 'VinylBase'
