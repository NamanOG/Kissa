import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'

/**
 * Small pieces the Pressed story is built from. Everything here moves with transform and
 * opacity only, plays once, and settles; nothing keeps running after a scene has arrived.
 */

/** A long, soft settle, for things arriving in a scene. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** For things leaving or travelling between places. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

/**
 * Words that rise out of a mask one after another, like type being set. The whole line is
 * read once by screen readers; the moving pieces are hidden from them.
 */
export function Words({
  text,
  delay = 0,
  stagger = 0.055,
  duration = 0.95,
  reduce,
  className
}: {
  text: string
  delay?: number
  stagger?: number
  duration?: number
  reduce: boolean
  className?: string
}): React.JSX.Element {
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <motion.span
                className="inline-block will-change-transform"
                initial={reduce ? false : { y: '108%', rotate: 2.5 }}
                animate={{ y: '0%', rotate: 0 }}
                transition={{ duration, ease: EASE_OUT, delay: delay + i * stagger }}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </span>
    </span>
  )
}

/** A line that fades and lifts in, for supporting text. */
export function Lift({
  delay = 0,
  y = 14,
  reduce,
  className,
  children
}: {
  delay?: number
  y?: number
  reduce: boolean
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * A number that runs up from zero like a tape counter, then rests. It writes straight into
 * the DOM, so React does not re-render on every frame.
 */
export function CountUp({
  value,
  decimals = 0,
  lang,
  delay = 0,
  duration = 1.8,
  reduce,
  className
}: {
  value: number
  decimals?: number
  lang: string
  delay?: number
  duration?: number
  reduce: boolean
  className?: string
}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  const fmt = useMemo(
    () => new Intl.NumberFormat(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [lang, decimals]
  )
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) {
      el.textContent = fmt.format(value)
      return
    }
    el.textContent = fmt.format(0)
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.12, 0.8, 0.24, 1],
      onUpdate: (v) => {
        el.textContent = fmt.format(v)
      }
    })
    return () => controls.stop()
  }, [value, fmt, delay, duration, reduce])
  return (
    <span className={className}>
      <span className="sr-only">{fmt.format(value)}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {fmt.format(reduce ? value : 0)}
      </span>
    </span>
  )
}

/* -------------------------------------------------------------------------------------------- */

const washes = new Map<string, string | null>()

/**
 * A cover shrunk to a few pixels and softened once on a canvas. Stretched over the window it
 * becomes a wash of the record's colours, with no live blur filter to redraw.
 */
function makeWash(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Covers from the web can be read back only when fetched with CORS; data: covers always can.
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 40
        const ctx = c.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.filter = 'blur(3px) saturate(1.35)'
        ctx.drawImage(img, -6, -6, 52, 52)
        resolve(c.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function useWash(url?: string): string | null {
  const [, setVersion] = useState(0)
  useEffect(() => {
    if (!url || washes.has(url)) return
    let alive = true
    void makeWash(url).then((w) => {
      washes.set(url, w)
      if (alive) setVersion((v) => v + 1)
    })
    return () => {
      alive = false
    }
  }, [url])
  return url ? (washes.get(url) ?? null) : null
}

/**
 * The colour of the scene: the wash of its record, crossfading when the record changes and
 * drifting slowly while a scene plays. Only transform and opacity move.
 */
export function StoryBackdrop({
  cover,
  scene,
  seconds,
  reduce
}: {
  cover?: string
  scene: string
  seconds: number
  reduce: boolean
}): React.JSX.Element {
  const made = useWash(cover)
  // When a cover cannot be read back, the same wash comes from the cover drawn tiny and
  // softened, then stretched: the blur runs on a few pixels once, never on the window.
  const wash = made ?? cover ?? null
  const tiny = !made
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Each scene gets its own layer, so the light crossfades and the drift starts afresh. */}
      <AnimatePresence initial={false}>
        {wash && (
          <motion.div
            key={scene}
            className="absolute inset-[-14%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.62 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.6, ease: EASE_IN_OUT }}
          >
            <motion.div
              initial={reduce ? false : { scale: 1.14, rotate: -2, x: '-1.5%' }}
              animate={{ scale: 1, rotate: 0, x: '1.5%' }}
              transition={{ duration: Math.max(4, seconds), ease: 'linear' }}
              className="absolute inset-0 will-change-transform"
            >
              {tiny ? (
                <div className="absolute left-1/2 top-1/2 h-[2vmax] w-[2vmax] -translate-x-1/2 -translate-y-1/2 scale-[72]">
                  <img src={wash} alt="" className="h-full w-full object-cover [filter:blur(2.5px)_saturate(1.35)]" draggable={false} />
                </div>
              ) : (
                <img src={wash} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_45%,rgba(8,6,5,0.25)_0%,rgba(8,6,5,0.62)_60%,rgba(8,6,5,0.94)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(8,6,5,0.7)] to-transparent" />
    </div>
  )
}

/* -------------------------------------------------------------------------------------------- */

/** A camera move for one scene: where the shot starts, where it settles, where it drifts to. */
export interface CameraMove {
  from: string
  settle: string
  to: string
}

/**
 * Moves the whole scene like a camera: a quick, eased arrival (a pull back, a push in, a
 * truck or a slight roll), then a slow drift for as long as the scene holds, the way a film
 * shot never quite stops. It runs on the compositor (Web Animations, transform only) and
 * pauses with the story.
 */
export function Camera({
  move,
  seconds,
  paused,
  reduce,
  children
}: {
  move?: CameraMove
  seconds: number
  paused: boolean
  reduce: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const anim = useRef<Animation | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !move || reduce || typeof el.animate !== 'function') return
    const total = Math.max(4, seconds) * 1000
    const settleAt = Math.min(0.45, 2600 / total)
    const a = el.animate(
      [
        { transform: move.from, offset: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        { transform: move.settle, offset: settleAt, easing: 'linear' },
        { transform: move.to, offset: 1 }
      ],
      { duration: total, fill: 'both' }
    )
    anim.current = a
    return () => {
      a.cancel()
      anim.current = null
    }
  }, [move, seconds, reduce])
  useEffect(() => {
    const a = anim.current
    if (!a) return
    if (paused && a.playState === 'running') a.pause()
    else if (!paused && a.playState === 'paused') a.play()
  }, [paused])
  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center will-change-transform">
      {children}
    </div>
  )
}

/**
 * A band of warm light that crosses the room at each cut, like light catching a lens as the
 * shot changes. Transform and opacity only; absent with reduced motion.
 */
export function LightSweep({ reduce }: { reduce: boolean }): React.JSX.Element | null {
  if (reduce) return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <motion.div
        className="absolute inset-y-[-20%] left-0 w-[46%] will-change-transform bg-[linear-gradient(100deg,transparent_0%,rgba(255,232,206,0.05)_38%,rgba(255,232,206,0.1)_50%,rgba(255,232,206,0.05)_62%,transparent_100%)]"
        initial={{ x: '-110%', opacity: 0, skewX: -8 }}
        animate={{ x: '330%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.7, ease: EASE_IN_OUT, opacity: { duration: 1.7, times: [0, 0.2, 0.7, 1] } }}
      />
    </div>
  )
}
