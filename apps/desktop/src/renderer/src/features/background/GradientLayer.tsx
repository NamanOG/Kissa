import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { AnimatePresence, motion } from 'framer-motion'
import { AmbientDrift } from './AmbientDrift'
import { FluidAmbient } from './FluidAmbient'

export const GradientLayer = memo(() => {
  const currentThemeId = usePlayerStore((s) => s.theme)
  const env =
    LISTENING_ENVIRONMENTS.find((e) => e.id === currentThemeId) ?? LISTENING_ENVIRONMENTS[0]
  
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const ambientMotion = usePlayerStore((s) => s.ambientMotion)

  return (
    <BackgroundLayer className="overflow-hidden adaptive-ambient">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: currentThemeId === 'adaptive' ? 'var(--adaptive-base-temp, #050505)' : env.ambient.bgColor,
          transition: 'background-color 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {currentThemeId === 'adaptive' && ambientMotion && artworkUrl ? (
        // Moving light: one renderer for Home and full screen (this layer sits under both).
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.95 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none"
        >
          <FluidAmbient artworkUrl={artworkUrl} />
        </motion.div>
      ) : currentThemeId === 'adaptive' ? (
        <AnimatePresence>
          {artworkUrl && (
            <motion.div
              key={artworkUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.92 }} // The album's light fills the room; the shade below keeps it a room
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none"
            >
              <AmbientDrift artworkUrl={artworkUrl} />
            </motion.div>
          )}
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

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: currentThemeId === 'adaptive'
            ? ambientMotion
              ? // Lighter, so the flowing colour shows; still dark enough at the edges. A soft shade on the
                // left keeps the title, album and duration readable when the cover's colours are light.
                'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0) 55%), radial-gradient(ellipse 110% 100% at 50% 50%, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0.32) 70%, rgba(0,0,0,0.6) 100%)'
              : // Light pools in the middle of the room and falls off to the corners; a soft shade on the
                // left keeps the words readable over a bright cover.
                'linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0) 55%), radial-gradient(ellipse 105% 95% at 58% 42%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 100%)'
            : 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
          transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
      
      {currentThemeId === 'adaptive' && !(ambientMotion && artworkUrl) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 120% 120% at var(--adaptive-primary-x, 50%) var(--adaptive-primary-y, 50%), var(--adaptive-ambient-primary, transparent) 0%, transparent 50%)`,
            opacity: 0.5,
            mixBlendMode: 'screen',
            transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      )}

      {/* A studio light from above: a faint lift at the top of every room, so it never reads flat. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% -8%, rgba(255,240,225,0.07) 0%, rgba(255,240,225,0.02) 45%, transparent 70%)'
        }}
      />
    </BackgroundLayer>
  )
})

GradientLayer.displayName = 'GradientLayer'
