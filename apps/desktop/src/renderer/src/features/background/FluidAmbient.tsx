import { memo, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { AmbientDrift } from './AmbientDrift'
import { createFluidRenderer, type FluidRenderer } from './fluidRenderer'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { soundListener } from '@renderer/features/sound/soundListener'
import { useWindowVisible } from '@renderer/hooks/useWindowVisible'
import { useDocumentCovered } from '@renderer/hooks/useDocumentCovered'
import { extractPalette, paletteTexture, SLOTS } from './colourField'

export { VERT, FRAG } from './fluidRenderer'

/**
 * Moving light: the album's colours flowing behind the room, the way light pools and drifts
 * across a wall. Broad regions of the cover's own colours change shape and blend; the cover
 * itself stays still on the deck.
 *
 * How it stays cheap:
 * - The colour field is drawn at about 40% of the window (at most 640 px wide). (At 20% the
 *   stretch showed as coarse blocks.) A second, very cheap pass stretches it to the window's own
 *   pixels and adds a fine dither, so a dark room shows no stepped contour lines.
 * - 30 frames a second on the display's refresh grid, and only while it can be seen: it stops when
 *   Moving light is off (this component unmounts and releases its context), when playback is
 *   paused, when the Focus Room or a full-window story (Pressed) covers it, when the window is minimised or
 *   hidden in the tray, and under reduced motion (one still frame).
 * - The cover is read once per track into its palette (up to six colours from the whole cover).
 *   Track changes crossfade; a late load from a skipped track is ignored.
 * - No React state per frame.
 *
 * If WebGL is unavailable, the context is lost, or the cover cannot be read, a still image of
 * the cover's colours shows instead (no animation). A readable cover recovers by itself.
 */

const MAX_WIDTH = 640
const SAMPLE = 48
const RETRY_MS = 5000
/** Longest side of the canvas in device pixels. */
const MAX_OUTPUT = 2560

/**
 * The cover's palette, ready to upload: the cover is read at 48 px, its main colours are found
 * across the whole image (corners and edges included) and written as a small strip, one texel
 * per colour (colourField.ts). Done once per track.
 */
export function loadCover(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!url.startsWith('data:')) img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const small = document.createElement('canvas')
      small.width = SAMPLE
      small.height = SAMPLE
      const sctx = small.getContext('2d', { willReadFrequently: true })
      const c = document.createElement('canvas')
      c.width = SLOTS
      c.height = 1
      const ctx = c.getContext('2d')
      if (!sctx || !ctx) return reject(new Error('no 2d'))
      sctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
      try {
        const palette = extractPalette(sctx.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE)
        ctx.putImageData(new ImageData(paletteTexture(palette), SLOTS, 1), 0, 0)
      } catch (e) {
        return reject(e instanceof Error ? e : new Error('cover unreadable'))
      }
      resolve(c)
    }
    img.onerror = () => reject(new Error('cover failed'))
    img.src = url
  })
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl'))
  } catch {
    return false
  }
}

/** The surface size for a window: small, with the window's shape. */
export function surfaceSize(innerWidth: number, innerHeight: number): [number, number] {
  const w = Math.min(MAX_WIDTH, Math.max(64, Math.round(innerWidth / 2.5)))
  const h = Math.max(36, Math.round((w * innerHeight) / Math.max(1, innerWidth)))
  return [w, h]
}

/** The canvas size: the window's own pixels, capped so a very large display stays cheap. */
export function outputSize(innerWidth: number, innerHeight: number, dpr: number): [number, number] {
  const scale = Math.min(Math.max(1, dpr || 1), MAX_OUTPUT / Math.max(1, innerWidth, innerHeight))
  return [Math.max(1, Math.round(innerWidth * scale)), Math.max(1, Math.round(innerHeight * scale))]
}

function useReducedMotion(): boolean {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const [reduced, setReduced] = useState(() => Boolean(query?.matches))
  useEffect(() => {
    if (!query) return
    const on = (): void => setReduced(query.matches)
    query.addEventListener?.('change', on)
    return () => query.removeEventListener?.('change', on)
  }, [query])
  return reduced
}

export const FluidAmbient = memo(({ artworkUrl, coverLoader = loadCover }: { artworkUrl: string; coverLoader?: (url: string) => Promise<TexImageSource> }) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<FluidRenderer | null>(null)
  const loaderRef = useRef(coverLoader)
  loaderRef.current = coverLoader
  // Graphics unavailable (no WebGL, shader failure, lost context): the still image.
  const [glFailed, setGlFailed] = useState(false)
  // The outcome of the latest cover load. A failure applies only to that URL.
  const [cover, setCover] = useState<{ url: string; ok: boolean } | null>(null)

  const soundLight = useFeaturesStore((s) => s.soundLight)
  const soundRef = useRef(soundLight)
  soundRef.current = soundLight
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  // The mini player does not cover it: there the light runs behind the record, on the same
  // small surface (sized from the mini window) and the same 30 fps beat.
  const roomCovered = usePlayerStore((s) => !s.isMiniPlayer && s.activeView === 'study')
  // Pressed covering the whole window: the app beneath is not drawn, but a running WebGL loop
  // still cost a ~40 ms stall in the story about every 400 ms.
  const storyCovered = useDocumentCovered()
  const covered = roomCovered || storyCovered
  const visible = useWindowVisible()
  const reduced = useReducedMotion()
  const coverFailed = cover?.url === artworkUrl && !cover.ok

  // Create the renderer; dispose it on unmount or failure. Every path through here releases
  // the context, timers, listeners and the blur override.
  useEffect(() => {
    const host = hostRef.current
    if (!host || glFailed) return
    // A fresh canvas each time: a released context cannot be used again.
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.className = 'absolute inset-0 h-full w-full'
    host.appendChild(canvas)
    const renderer = createFluidRenderer(
      canvas,
      {
        loadCover: (url) => loaderRef.current(url),
        sound: () => (soundRef.current && soundListener.status === 'live' ? soundListener.levels : null),
        onDraw: import.meta.env.DEV
          ? () => {
              const w = window as unknown as { __kissaAmbientFrames?: number }
              w.__kissaAmbientFrames = (w.__kissaAmbientFrames ?? 0) + 1
            }
          : undefined
      },
      {
        onCover: (url, ok) => setCover({ url, ok }),
        onFail: () => setGlFailed(true),
        // While the colour moves, glass panels skip their backdrop blur (see main.css): a blur
        // over a moving background has to be recomputed for every frame.
        onRunning: (running) => {
          if (running) document.documentElement.setAttribute('data-moving-light', '')
          else document.documentElement.removeAttribute('data-moving-light')
        }
      }
    )
    if (!renderer) {
      canvas.remove()
      setGlFailed(true)
      return
    }
    rendererRef.current = renderer
    const resize = (): void =>
      renderer.resize(
        ...surfaceSize(window.innerWidth, window.innerHeight),
        ...outputSize(window.innerWidth, window.innerHeight, window.devicePixelRatio)
      )
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      renderer.dispose()
      rendererRef.current = null
      document.documentElement.removeAttribute('data-moving-light')
      canvas.remove()
    }
  }, [glFailed])

  // Load the cover for each track, and try a failed one once more a little later.
  useEffect(() => {
    if (glFailed) return
    rendererRef.current?.setCover(artworkUrl)
  }, [artworkUrl, glFailed])
  useEffect(() => {
    if (!coverFailed || glFailed) return
    const t = window.setTimeout(() => rendererRef.current?.setCover(artworkUrl), RETRY_MS)
    return () => window.clearTimeout(t)
  }, [coverFailed, glFailed, artworkUrl])

  useEffect(() => {
    rendererRef.current?.setActive(isPlaying && !covered && visible && !reduced && !coverFailed)
  }, [isPlaying, covered, visible, reduced, coverFailed, glFailed])

  if (glFailed) return <AmbientDrift artworkUrl={artworkUrl} />

  // The canvas host stays mounted while a cover fails, so the renderer is ready for the next
  // track; the still image sits on top.
  return (
    <>
      <div ref={hostRef} aria-hidden="true" data-ambient="fluid" className="absolute inset-0 pointer-events-none" />
      {coverFailed && <AmbientDrift artworkUrl={artworkUrl} />}
    </>
  )
})

FluidAmbient.displayName = 'FluidAmbient'
