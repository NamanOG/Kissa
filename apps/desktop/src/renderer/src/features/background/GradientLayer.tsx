import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '../settings/themes'

export const GradientLayer = memo(() => {
  const currentThemeId = usePlayerStore((s) => s.theme)
  const env =
    LISTENING_ENVIRONMENTS.find((e) => e.id === currentThemeId) ?? LISTENING_ENVIRONMENTS[0]

  return (
    <BackgroundLayer className="overflow-hidden transition-colors duration-700">
      {/* Dynamic Base Background Fill */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ backgroundColor: env.ambient.bgColor }}
      />

      {/* Dynamic Atmospheric Ambient Pool */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: env.ambient.gradient }}
      />
    </BackgroundLayer>
  )
})

GradientLayer.displayName = 'GradientLayer'
