import { memo, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { playDeckSound } from '@renderer/utils/deckSounds'
import { useT } from '@renderer/i18n'

/** How long the deck sits silent before the lid comes down by itself. */
export const DUST_COVER_DELAY_MS = 10 * 60_000

interface LidState {
  closed: boolean
  setClosed: (closed: boolean) => void
  toggle: () => void
}

/** Whether the dust lid is down. The LID key on the deck and the lid itself both change it. */
export const useLidStore = create<LidState>((set, get) => ({
  closed: false,
  setClosed: (closed) => set({ closed }),
  toggle: () => set({ closed: !get().closed })
}))

/** The lid swings on its hinges: from standing up (edge on, out of sight) down onto the deck. */
const UP = { rotateX: -92, opacity: 0 }
/**
 * A heavy acrylic lid on damped hinges: critically damped springs, so it settles without any
 * bounce and stays smooth if it is lifted again half way down.
 */
const LOWER = { type: 'spring', visualDuration: 0.85, bounce: 0 } as const
const RAISE = { type: 'spring', visualDuration: 0.6, bounce: 0 } as const

/** The lid's corner radius: the same soft corner as the plate it covers. */
const RADIUS = 'rounded-[15px]'
/** Reflections fade with the room light but never vanish entirely. */
const lit = (floor: number): string => `calc(${floor} + ${1 - floor} * var(--room-illumination, 1))`

/**
 * A border drawn as a masked gradient ring: one lit edge that is brightest towards the lamp
 * (upper left) and dimmer round the far sides, as a polished acrylic edge catches light.
 */
const ringMask: React.CSSProperties = {
  padding: '1.25px',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)'
}

/**
 * The dust lid: a hinged cover of lightly smoked acrylic with real thickness. It comes down
 * after ten minutes with nothing playing (when that is switched on) or with the LID key, and
 * lifts when music starts or when it is clicked, at any time. While it is down the keys under it
 * cannot be pressed, as with a real lid.
 *
 * Everything is static gradients and shadows: no backdrop blur (a blur over a turning record is
 * redrawn on every frame) and no texture. The material reads through light alone: a bright
 * polished edge, a second faint line where the far face of the wall shows through, a smoke that
 * deepens towards the walls, one soft reflection band from the room's lamp, and a thin front wall.
 */
export const DustCover = memo((): React.JSX.Element => {
  const t = useT()
  const auto = useFeaturesStore((s) => s.dustCover)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const closed = useLidStore((s) => s.closed)
  const setClosed = useLidStore((s) => s.setClosed)
  const reduceMotion = useReducedMotion()
  const wasPlaying = useRef(isPlaying)

  // Music starting lifts the lid; a lid closed by hand during playback stays down until it is
  // clicked.
  useEffect(() => {
    if (isPlaying && !wasPlaying.current) setClosed(false)
    wasPlaying.current = isPlaying
  }, [isPlaying, setClosed])

  // Ten quiet minutes and it comes down by itself. Opening it by hand starts the wait again.
  useEffect(() => {
    if (!auto || isPlaying || closed) return
    const id = window.setTimeout(() => setClosed(true), DUST_COVER_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [auto, isPlaying, closed, setClosed])

  const lift = (): void => {
    playDeckSound('toggle')
    setClosed(false)
  }

  const up = reduceMotion ? { opacity: 0 } : UP

  return (
    <>
      {/* The hinges stay on the deck whether the lid is up or down: two short barrels on the
          back edge, their knuckles marked, each with a small shadow on the plate. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[61] h-0">
        {['21%', '79%'].map((left) => (
          <span
            key={left}
            data-lid-hinge=""
            className="absolute top-[-2px] h-[10px] w-[5.5%] -translate-x-1/2 overflow-hidden rounded-[3px]"
            style={{
              left,
              background: 'linear-gradient(180deg, #44454a 0%, #2a2b2f 38%, #18191c 72%, #101113 100%)',
              boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.24)',
                'inset 0 -1px 0 rgba(0,0,0,0.55)',
                '0 2px 3px -1px rgba(0,0,0,0.5)',
                '0 0 0 0.5px rgba(0,0,0,0.45)'
              ].join(', ')
            }}
          >
            {['33.3%', '66.6%'].map((x) => (
              <span
                key={x}
                className="absolute inset-y-[1px] w-px"
                style={{ left: x, background: 'rgba(0,0,0,0.55)', boxShadow: '1px 0 0 rgba(255,255,255,0.07)' }}
              />
            ))}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {closed && (
          <motion.button
            key="lid"
            type="button"
            data-testid="dust-cover"
            aria-label={t('lid.lift')}
            title={t('lid.lift')}
            onClick={lift}
            // The deck around it ignores the pointer; the lid itself must take clicks, or a lid
            // closed while music plays could never be lifted again.
            className={`group pointer-events-auto absolute z-[60] cursor-pointer ${RADIUS} focus:outline-none focus-visible:ring-2 focus-visible:ring-tone/70`}
            style={{
              left: '0.9%',
              top: '0.6%',
              width: '98.2%',
              height: '92%',
              transformOrigin: '50% 0%',
              // Its own perspective, so the swing reads as a lid on hinges, not a squash.
              transformPerspective: 1100
            }}
            initial={up}
            animate={{
              rotateX: 0,
              opacity: 1,
              transition: reduceMotion
                ? { duration: 0.25, ease: 'easeOut' }
                : { rotateX: LOWER, opacity: { duration: 0.18, ease: 'easeOut' } }
            }}
            exit={{
              ...up,
              transition: reduceMotion
                ? { duration: 0.2, ease: 'easeIn' }
                : { rotateX: RAISE, opacity: { duration: 0.18, delay: 0.38, ease: 'easeIn' } }
            }}
          >
            {/* Its shadow on the plinth: tight at the walls, a little softer below the front. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${RADIUS}`}
              style={{ boxShadow: '0 14px 30px -16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)' }}
            />
            {/* The sheet: a light neutral smoke, clear in the middle so the record shows, deeper
                towards the walls where the light travels through more acrylic. */}
            <span
              aria-hidden="true"
              data-lid-sheet=""
              className={`pointer-events-none absolute inset-0 ${RADIUS}`}
              style={{
                background:
                  'radial-gradient(130% 120% at 38% 34%, rgba(16,17,20,0.1) 0%, rgba(14,15,18,0.17) 45%, rgba(10,11,13,0.32) 84%, rgba(6,6,8,0.44) 100%)',
                boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.1), inset 0 0 28px rgba(0,0,0,0.16)'
              }}
            />
            {/* The room's lamp in the acrylic: one broad, soft band falling from the upper left,
                and a faint gloss along the hinge side. It dims with the room light. */}
            <span
              aria-hidden="true"
              data-lid-reflection=""
              className={`pointer-events-none absolute inset-0 overflow-hidden ${RADIUS}`}
              style={{
                opacity: lit(0.3),
                background: [
                  'linear-gradient(112deg, transparent 4%, rgba(255,250,242,0.06) 13%, rgba(255,250,242,0.16) 22%, rgba(255,250,242,0.07) 32%, transparent 44%)',
                  'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 14%)'
                ].join(', ')
              }}
            />
            {/* Thickness: the polished outer edge, brightest towards the lamp ... */}
            <span
              aria-hidden="true"
              data-lid-edge=""
              className={`pointer-events-none absolute inset-0 ${RADIUS}`}
              style={{
                ...ringMask,
                opacity: lit(0.45),
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.3) 28%, rgba(255,255,255,0.12) 62%, rgba(255,255,255,0.2) 100%)'
              }}
            />
            {/* ... the far face of the wall, a fainter line just inside it ... */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[4px] rounded-[11px]"
              style={{ ...ringMask, padding: '1px', background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.09))' }}
            />
            {/* ... and the hinge side, where the light runs along the top of the back wall. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[2.5%] top-[1px] h-[1.5px] rounded-full"
              style={{
                opacity: lit(0.4),
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0.32) 68%, transparent)'
              }}
            />
            {/* A brighter sheen on hover or focus, so it reads as something to lift. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${RADIUS} opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100`}
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 55%)' }}
            />
            {/* The front wall, seen just past the lid's top: thin, lit along its upper edge, with
                a shallow finger recess in the middle. */}
            <span
              aria-hidden="true"
              data-lid-front=""
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2.6%] rounded-b-[15px]`}
              style={{
                background: 'linear-gradient(180deg, rgba(20,20,23,0.34) 0%, rgba(10,10,12,0.58) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.1)'
              }}
            >
              <span
                className="absolute left-1/2 top-0 h-[60%] w-[7%] -translate-x-1/2 rounded-b-full transition-colors duration-300 ease-out group-hover:bg-white/[0.08]"
                style={{ background: 'rgba(0,0,0,0.26)', boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.5)' }}
              />
            </span>
            <span className="pointer-events-none absolute bottom-[6.5%] left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
              {t('lid.lift')}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
})

DustCover.displayName = 'DustCover'
