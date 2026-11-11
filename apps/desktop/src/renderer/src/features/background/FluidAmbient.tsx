import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { memo, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { AmbientDrift } from './AmbientDrift'
import { createFluidRenderer, type FluidRenderer, type SoundSignals } from './fluidRenderer'
import { getLightSource } from './lightSource'
import { SOUND_LIGHT_SCALE, useFeaturesStore } from '@renderer/stores/featuresStore'
import { soundListener } from '@renderer/features/sound/soundListener'
import { useWindowVisible } from '@renderer/hooks/useWindowVisible'
import { useDocumentCovered } from '@renderer/hooks/useDocumentCovered'
import { extractPalette, paletteTexture, SLOTS } from './colourField'
import { coverBitmap } from '@renderer/utils/coverBitmap'
import { useSheetOpen } from './sheetCount'

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
/** After a lost context (the GPU process restarted), how long to wait and how often to rebuild. */
const LOST_RETRY_MS = 3000
const LOST_RETRIES = 2
/** Longest side of the canvas in device pixels. */
const MAX_OUTPUT = 2560

/**
 * The cover's palette, ready to upload: the cover is read at 48 px, its main colours are found
 * across the whole image (corners and edges included) and written as a small strip, one texel
 * per colour (colourField.ts). Done once per track.
 */
export function loadCover(url: string): Promise<HTMLCanvasElement> {
  return coverBitmap(url).then(
    (img) =>
      new Promise<HTMLCanvasElement>((resolve, reject) => {
      const small = document.createElement('canvas')
      small.width = SAMPLE
      small.height = SAMPLE
      const sctx = small.getContext('2d', { willReadFrequently: true })
      const c = document.createElement('canvas')
      c.width = SLOTS
      c.height = 1
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!sctx || !ctx) return reject(new Error('no 2d'))
      sctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
      try {
        const palette = extractPalette(sctx.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE)
        ctx.putImageData(new ImageData(paletteTexture(palette), SLOTS, 1), 0, 0)
      } catch (e) {
        return reject(e instanceof Error ? e : new Error('cover unreadable'))
      }
      resolve(c)
      })
  )
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

/** The canvas size: half the window's own pixels, capped so a very large display stays cheap. */
export function outputSize(innerWidth: number, innerHeight: number, dpr: number): [number, number] {
  // Half the window's pixels: the field is soft and is scaled up by the compositor. At full size it
  // cost ~40 % of an Intel UHD 630 (live measurement, 2026-11-10); half is a quarter of the work.
  const scale = Math.min(Math.max(1, dpr || 1) * 0.5, MAX_OUTPUT / Math.max(1, innerWidth, innerHeight))
  return [Math.max(1, Math.round(innerWidth * scale)), Math.max(1, Math.round(innerHeight * scale))]
}

export const FluidAmbient = memo(({ artworkUrl, coverLoader = loadCover }: { artworkUrl: string; coverLoader?: (url: string) => Promise<TexImageSource> }) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<FluidRenderer | null>(null)
  const loaderRef = useRef(coverLoader)
  loaderRef.current = coverLoader
  // Graphics unavailable (no WebGL, shader failure, lost context): the still image.
  const [glFailed, setGlFailed] = useState(false)
  // Contexts lost so far (a GPU process restart, a driver reset): the light is rebuilt a few
  // seconds later, at most LOST_RETRIES times, instead of staying on the still image for good.
  const lostRef = useRef(0)
  // The outcome of the latest cover load. A failure applies only to that URL.
  const [cover, setCover] = useState<{ url: string; ok: boolean } | null>(null)

  const soundLight = useFeaturesStore((s) => s.soundLight)
  const soundRef = useRef(soundLight)
  soundRef.current = soundLight
  const amount = useFeaturesStore((s) => s.soundLightAmount)
  const amountRef = useRef(amount)
  amountRef.current = amount
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
  // A full sheet (Settings, Share, the guide) is open: the room settles beneath it.
  const sheetOpen = useSheetOpen()
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
        sound: () => {
          // Development: a fixed sound for screenshots (window.__kissaSound = {level, swell, bass, kick, pan}).
          if (import.meta.env.DEV) {
            const forced = (window as unknown as { __kissaSound?: SoundSignals }).__kissaSound
            if (forced) return forced
          }
          return soundRef.current && soundListener.status === 'live' ? soundListener.levels : null
        },
        source: getLightSource,
        amount: () => SOUND_LIGHT_SCALE[amountRef.current] ?? 1,
        onDraw: import.meta.env.DEV
          ? () => {
              const w = window as unknown as { __kissaAmbientFrames?: number }
              w.__kissaAmbientFrames = (w.__kissaAmbientFrames ?? 0) + 1
            }
          : undefined
      },
      {
        onCover: (url, ok) => setCover({ url, ok }),
        onFail: (reason) => {
          if (reason === 'context lost') lostRef.current += 1
          setGlFailed(true)
        },
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

  // Hidden, covered, reduced motion or a failed cover: stop at once. Pause, play and a sheet
  // opening over the room: ease, so the colour coasts with the record instead of freezing.
  const allowed = !covered && visible && !reduced && !coverFailed
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    if (!allowed) r.setActive(false)
    else r.setActive(isPlaying && !sheetOpen, { coast: true })
  }, [isPlaying, allowed, sheetOpen, glFailed])

  useEffect(() => {
    if (!glFailed || lostRef.current === 0 || lostRef.current > LOST_RETRIES) return
    const t = window.setTimeout(() => setGlFailed(false), LOST_RETRY_MS)
    return () => window.clearTimeout(t)
  }, [glFailed])

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
