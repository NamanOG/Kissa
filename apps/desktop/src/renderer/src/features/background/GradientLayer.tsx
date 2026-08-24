import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'
import { AnimatePresence, motion } from 'framer-motion'

export const GradientLayer = memo(() => {
  const currentThemeId = usePlayerStore((s) => s.theme)
  const env =
    LISTENING_ENVIRONMENTS.find((e) => e.id === currentThemeId) ?? LISTENING_ENVIRONMENTS[0]
  
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)

  return (
    <BackgroundLayer className="overflow-hidden">
      {/* 1. Static base fill — transitions smoothly on theme change or palette base Temp */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: currentThemeId === 'adaptive' ? 'var(--adaptive-base-temp, #050505)' : env.ambient.bgColor,
          transition: 'background-color 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {/* 2. Hybrid Artwork Ambient Field (Adaptive Mode Only) */}
      {currentThemeId === 'adaptive' ? (
        <AnimatePresence>
          {artworkUrl && (
            <motion.div
              key={artworkUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }} // Strong enough to cast color, but relies on vignette to keep room dark
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${artworkUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                // Massive blur to destroy objects/shapes, saturate to preserve color, scale to avoid edge bleeding
                filter: 'blur(100px) saturate(1.8) contrast(1.1)',
                transform: 'scale(1.2)' 
              }}
            />
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

      {/* 3. Deep Radial Vignette / Dark Compositing mask */}
      {/* This pushes the bright blurred artwork far into the background, darkening edges and center slightly to keep it feeling like a dark room */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: currentThemeId === 'adaptive' 
            ? 'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(0,0,0,0.4) 10%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.95) 100%)'
            : 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
          transition: 'background 1500ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />
      
      {/* 4. Subtle palette enhancement for adaptive mode (optional but adds dimension to primary focus area) */}
      {currentThemeId === 'adaptive' && (
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
