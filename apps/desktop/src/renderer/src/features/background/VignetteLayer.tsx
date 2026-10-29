import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'

// Dark rooms: the corners fall into shadow, which keeps the eye on the deck.
const DARK =
  'radial-gradient(ellipse 92% 86% at 54% 46%, transparent 35%, rgba(24, 17, 14, 0.14) 72%, rgba(12, 9, 8, 0.36) 100%)'
// Light rooms set dark text in the corners (the top bar, the dock ends), and a deep vignette
// sank that text into grey. A lighter edge keeps the shape of the light and the words readable.
const LIGHT =
  'radial-gradient(ellipse 96% 90% at 54% 46%, transparent 45%, rgba(24, 17, 14, 0.05) 76%, rgba(12, 9, 8, 0.12) 100%)'

export const VignetteLayer = memo(() => {
  const light = usePlayerStore(
    (s) => LISTENING_ENVIRONMENTS.find((env) => env.id === s.theme)?.ui.vinylMood === 'light'
  )
  return (
    <BackgroundLayer
      className="pointer-events-none"
      style={{ background: light ? LIGHT : DARK }}
    />
  )
})

VignetteLayer.displayName = 'VignetteLayer'
