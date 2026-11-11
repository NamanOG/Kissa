import { memo, useEffect, useRef, type CSSProperties } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { AmbientDrift } from './AmbientDrift'
import { FluidAmbient } from './FluidAmbient'

const EASE_IN: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EASE_OUT: [number, number, number, number] = [0.4, 0, 1, 1]
/** Moving light on or off: both layers crossfade over this long. */
const TOGGLE_S = 0.6
/** A new cover's still light. */
const COVER_S = 1.5
/** The first light of a session. */
const FIRST_S = 1.2

// Lighter, so the flowing colour shows; still dark enough at the edges. A soft shade on the left
// keeps the title, album and duration readable when the cover's colours are light.
const MOVING_SHADE =
  'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0) 55%), radial-gradient(ellipse 110% 100% at 50% 50%, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0.32) 70%, rgba(0,0,0,0.6) 100%)'
// Light pools in the middle of the room and falls off to the corners; a soft shade on the left
// keeps the words readable over a bright cover.
const STILL_SHADE =
  'linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0) 55%), radial-gradient(ellipse 105% 95% at 58% 42%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 100%)'
const MANUAL_VIGNETTE =
  'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)'

/**
 * A layer that fades in and out with opacity (a gradient itself cannot transition). Once faded
 * out it is hidden, so it costs nothing in later frames.
 */
function fade(on: boolean, opacity = 1): CSSProperties {
  return {
    opacity: on ? opacity : 0,
    visibility: on ? 'visible' : 'hidden',
    transition: `opacity ${TOGGLE_S * 1000}ms cubic-bezier(${(on ? EASE_IN : EASE_OUT).join(',')}), visibility 0s linear ${on ? 0 : TOGGLE_S * 1000}ms`
  }
}

/** How long a layer takes, from AnimatePresence's `custom`: quick for a Moving light toggle. */
type Timing = { toggle: boolean; first: boolean }
const movingVariants: Variants = {
  hidden: { opacity: 0 },
  shown: (c: Timing) => ({
    opacity: 1,
    transition: { duration: c.first ? FIRST_S : TOGGLE_S, ease: EASE_IN }
  }),
  gone: (c: Timing) => ({
    opacity: 0,
    transition: { duration: c.toggle ? TOGGLE_S : COVER_S, ease: EASE_OUT }
  })
}
const stillVariants: Variants = {
  hidden: { opacity: 0 },
  // The album's light fills the room; the shade below keeps it a room.
  shown: (c: Timing) => ({
    opacity: 0.92,
    transition: { duration: c.toggle ? TOGGLE_S : COVER_S, ease: c.toggle ? EASE_IN : 'easeInOut' }
  }),
  gone: (c: Timing) => ({
    opacity: 0,
    transition: { duration: c.toggle ? TOGGLE_S : COVER_S, ease: c.toggle ? EASE_OUT : 'easeInOut' }
  })
}

export const GradientLayer = memo(() => {
  const currentThemeId = usePlayerStore((s) => s.theme)
  const env =
    LISTENING_ENVIRONMENTS.find((e) => e.id === currentThemeId) ?? LISTENING_ENVIRONMENTS[0]

  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const ambientMotion = usePlayerStore((s) => s.ambientMotion)
  const adaptive = currentThemeId === 'adaptive'
  const moving = adaptive && ambientMotion && Boolean(artworkUrl)

  // Whether this render follows a Moving light toggle (quick crossfade) rather than a cover change
  // or the first light of the session.
  const prevMotion = useRef<boolean | null>(null)
  const timing: Timing = {
    toggle: prevMotion.current !== null && prevMotion.current !== ambientMotion,
    first: prevMotion.current === null
  }
  useEffect(() => {
    prevMotion.current = ambientMotion
  }, [ambientMotion])

  return (
    <BackgroundLayer className="overflow-hidden">
      {/* The base fades to a new album colour with its own 1.5 s transition. It used to sit inside
          the layer that also animated the colour variable, which restarted this transition on
          every frame (21 restarts and full-window repaints per song, measured 2026-11-11). Only
          the glow below animates the variables (main.css, .adaptive-ambient). */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: adaptive ? 'var(--adaptive-base-temp, #050505)' : env.ambient.bgColor,
          transition: 'background-color 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {adaptive ? (
        // Moving light and the still light share one presence, so turning Moving light on or off
        // crossfades (the incoming layer rises fast while the outgoing one holds, so the bare
        // base never shows through). One renderer serves Home and full screen.
        <AnimatePresence custom={timing}>
          {moving ? (
            <motion.div
              key="moving"
              custom={timing}
              variants={movingVariants}
              initial="hidden"
              animate="shown"
              exit="gone"
              className="absolute inset-0 pointer-events-none"
            >
              {/* The light's 0.95 is in its shader (fluidRenderer), so this wrapper fades to 1
                  and needs no offscreen pass once the fade is done. */}
              <FluidAmbient artworkUrl={artworkUrl!} />
            </motion.div>
          ) : artworkUrl ? (
            <motion.div
              key={`still-${artworkUrl}`}
              custom={timing}
              variants={stillVariants}
              initial="hidden"
              animate="shown"
              exit="gone"
              className="absolute inset-0 pointer-events-none"
            >
              <AmbientDrift artworkUrl={artworkUrl} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        /* Original gradient behavior for manual themes */
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: env.ambient.gradient,
            transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      )}

      {/* The room's shades: one per mode, crossfaded with the light. */}
      <div
        aria-hidden="true"
        data-shade="moving"
        className="absolute inset-0 pointer-events-none"
        style={{ background: MOVING_SHADE, ...fade(adaptive && ambientMotion) }}
      />
      <div
        aria-hidden="true"
        data-shade="still"
        className="absolute inset-0 pointer-events-none"
        style={{ background: STILL_SHADE, ...fade(adaptive && !ambientMotion) }}
      />
      {!adaptive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: MANUAL_VIGNETTE }}
        />
      )}

      {adaptive && (
        <div className="adaptive-ambient absolute inset-0 pointer-events-none">
          <div
            aria-hidden="true"
            data-shade="glow"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 120% 120% at var(--adaptive-primary-x, 50%) var(--adaptive-primary-y, 50%), var(--adaptive-ambient-primary, transparent) 0%, transparent 50%)`,
              mixBlendMode: 'screen',
              ...fade(!moving, 0.5)
            }}
          />
        </div>
      )}

      {/* A studio light from above: a faint lift at the top of every room, so it never reads flat. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% -8%, rgba(255,240,225,0.07) 0%, rgba(255,240,225,0.02) 45%, transparent 70%)'
        }}
      />
    </BackgroundLayer>
  )
})

GradientLayer.displayName = 'GradientLayer'
