import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * Dark gradients band on 8-bit displays. A very faint, even grain breaks the bands
 * up without reading as texture.
 */
export const NoiseLayer = memo(() => (
  <BackgroundLayer
    className="opacity-[0.035] mix-blend-overlay"
    style={{ backgroundImage: GRAIN, backgroundSize: '240px 240px' }}
  />
))

NoiseLayer.displayName = 'NoiseLayer'
