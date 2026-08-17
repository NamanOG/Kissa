import { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'

export const VignetteLayer = memo(() => {
  return (
    <BackgroundLayer
      className="pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 92% 86% at 54% 46%, transparent 35%, rgba(24, 17, 14, 0.22) 70%, rgba(12, 9, 8, 0.48) 100%)'
      }}
    />
  )
})

VignetteLayer.displayName = 'VignetteLayer'
