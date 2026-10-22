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
              animate={{ opacity: 0.65 }} // Strong enough to cast color, but relies on vignette to keep room dark
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
              : 'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(0,0,0,0.4) 10%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.95) 100%)'
            : 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
          transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
      
      {currentThemeId === 'adaptive' && !(ambientMotion && artworkUrl) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 120% 120% at var(--adaptive-primary-x, 50%) var(--adaptive-primary-y, 50%), var(--adaptive-ambient-primary, transparent) 0%, transparent 50%)`,
            opacity: 0.35,
            mixBlendMode: 'screen',
            transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      )}

    </BackgroundLayer>
  )
})

GradientLayer.displayName = 'GradientLayer'
