import { memo, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
/** A heavy acrylic lid lands softly: no bounce, a slow last few degrees. */
const LOWER = { type: 'spring', stiffness: 70, damping: 21, mass: 1.25 } as const
const RAISE = { duration: 0.75, ease: [0.4, 0, 0.2, 1] } as const

/**
 * The dust lid: a hinged cover of smoked acrylic with real thickness. It comes down after ten
 * minutes with nothing playing (when that is switched on) or with the LID key, and lifts when
 * music starts or when it is clicked, at any time. While it is down the keys under it cannot be
 * pressed, as with a real lid.
 *
 * It is drawn without a backdrop blur: a blur over a turning record has to be redone on every
 * frame, which is what made the closed lid heavy.
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
      {/* The hinges stay on the deck whether the lid is up or down. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[61] h-0">
        {['21%', '79%'].map((left) => (
          <span
            key={left}
            className="absolute top-[-0.35%] h-[11px] w-[6.5%] -translate-x-1/2 rounded-[2.5px]"
            style={{
              left,
              background:
                'linear-gradient(180deg, #5a5048 0%, #2e2722 38%, #17120f 62%, #2f2823 100%)',
              boxShadow:
                'inset 0 0.5px 0 rgba(255,255,255,0.32), inset 0 -0.5px 0 rgba(0,0,0,0.6), 0 2px 3px rgba(0,0,0,0.55)'
            }}
          >
            <span className="absolute inset-x-[12%] top-1/2 h-px -translate-y-1/2 bg-black/60 shadow-[0_0.5px_0_rgba(255,255,255,0.12)]" />
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
            className="group pointer-events-auto absolute z-[60] cursor-pointer rounded-[16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-tone/70"
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
                ? { duration: 0.3 }
                : { rotateX: LOWER, opacity: { duration: 0.18, ease: 'easeOut' } }
            }}
            exit={{
              ...up,
              transition: reduceMotion
                ? { duration: 0.2 }
                : { rotateX: RAISE, opacity: { duration: 0.2, delay: 0.55, ease: 'easeIn' } }
            }}
          >
            {/* Its shadow on the plinth, just past the lid's edges. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[16px]"
              style={{
                boxShadow: '0 22px 40px -20px rgba(0,0,0,0.7), 0 4px 10px -4px rgba(0,0,0,0.55)'
              }}
            />
            {/* The smoked sheet: clear enough to see the deck, tinted like a real lid. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[16px]"
              style={{
                background:
                  'linear-gradient(176deg, rgba(40,32,27,0.30) 0%, rgba(22,17,14,0.36) 50%, rgba(12,9,8,0.46) 100%)'
              }}
            />
            {/* Thickness: a polished top edge, the walls seen through the sheet, a lit back rim. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[16px]"
              style={{
                boxShadow: [
                  'inset 0 0 0 1px rgba(255,238,220,0.34)',
                  'inset 0 1.5px 0 rgba(255,246,234,0.55)',
                  'inset 0 0 0 3.5px rgba(14,11,9,0.42)',
                  'inset 0 0 0 4.5px rgba(255,238,220,0.10)',
                  'inset 0 0 18px 2px rgba(0,0,0,0.22)'
                ].join(', ')
              }}
            />
            {/* The room's light caught in the acrylic: one broad soft band and a thin bright one. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]"
              style={{
                background: [
                  'linear-gradient(118deg, transparent 22%, rgba(255,248,240,0.10) 30%, rgba(255,248,240,0.03) 40%, transparent 46%)',
                  'linear-gradient(118deg, transparent 47%, rgba(255,248,240,0.08) 48.5%, transparent 50%)',
                  'radial-gradient(120% 60% at 80% -12%, color-mix(in srgb, var(--accent, #d7a76c) 12%, transparent), transparent 60%)',
                  'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 18%)'
                ].join(', ')
              }}
            />
            {/* A brighter sheen on hover or focus, so it reads as something to lift. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 55%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,238,220,0.18)'
              }}
            />
            {/* The front wall, facing the listener, with a finger lip in the middle. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[4.2%] rounded-b-[16px]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,240,222,0.20) 0%, rgba(44,35,29,0.5) 20%, rgba(16,12,10,0.72) 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,244,230,0.4), inset 0 -1px 0 rgba(255,236,214,0.14)'
              }}
            >
              <span
                className="absolute left-1/2 top-[22%] h-[40%] w-[9%] -translate-x-1/2 rounded-b-full transition-colors duration-300 group-hover:bg-white/[0.14]"
                style={{
                  background: 'rgba(0,0,0,0.36)',
                  boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6), 0 0.5px 0 rgba(255,240,222,0.18)'
                }}
              />
            </span>
            <span className="pointer-events-none absolute bottom-[6.5%] left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              {t('lid.lift')}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
})

DustCover.displayName = 'DustCover'
