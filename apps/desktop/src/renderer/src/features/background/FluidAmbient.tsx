import { memo, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { AmbientDrift } from './AmbientDrift'
import { createFluidRenderer, type FluidRenderer } from './fluidRenderer'
import { extractPalette, paletteTexture, SLOTS } from './colourField'

export { VERT, FRAG } from './fluidRenderer'

/**
 * Moving light: the album's colours flowing behind the room, the way light pools and drifts
 * across a wall. Broad regions of the cover's own colours change shape and blend; the cover
 * itself stays still on the deck.
 *
 * How it stays cheap:
 * - One WebGL surface at about 40% of the window (at most 640 px wide), stretched by the
 *   compositor. (At 20% the stretch showed as coarse blocks.)
 * - 30 frames a second on the display's refresh grid, and only while it can be seen: it stops when
 *   Moving light is off (this component unmounts and releases its context), when playback is
 *   paused, when the mini player or the Focus Room covers it, when the window is minimised or
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

/** Whether the app window can be seen (not minimised, not hidden in the tray). */
function useWindowVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const onDoc = (): void => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onDoc)
    // Minimising or hiding to the tray does not change document.hidden on Windows; the main
    // process says so instead.
    const off = window.electron?.onWindowVisibility?.((v) => setVisible(v && !document.hidden))
    return () => {
      document.removeEventListener('visibilitychange', onDoc)
      off?.()
    }
  }, [])
  return visible
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

  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const covered = usePlayerStore((s) => s.isMiniPlayer || s.activeView === 'study')
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
    const resize = (): void => renderer.resize(...surfaceSize(window.innerWidth, window.innerHeight))
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
