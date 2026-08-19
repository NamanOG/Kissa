import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'

/**
 * Renders the full-screen atmospheric background for the current theme.
 * Each theme has a bgColor (base fill) + multi-stop gradient (ambient light pools).
 * Uses transition-all for smooth theme switching animation.
 */
export const GradientLayer = memo(() => {
  const currentThemeId = usePlayerStore((s) => s.theme)
  const env =
    LISTENING_ENVIRONMENTS.find((e) => e.id === currentThemeId) ?? LISTENING_ENVIRONMENTS[0]

  return (
    <BackgroundLayer className="overflow-hidden">
      {/* Static base fill — transitions smoothly on theme change */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: env.ambient.bgColor,
          transition: 'background-color 600ms ease'
        }}
      />

      {/* Atmospheric ambient light pools — multi-stop gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: env.ambient.gradient,
          transition: 'background 600ms ease'
        }}
      />

      {/* Subtle vignette to keep edges deep */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)'
        }}
      />
    </BackgroundLayer>
  )
})

GradientLayer.displayName = 'GradientLayer'
