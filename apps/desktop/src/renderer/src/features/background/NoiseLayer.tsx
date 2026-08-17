import React, { memo } from 'react'
import { BackgroundLayer } from './BackgroundLayer'
export const NoiseLayer = memo(() => {
  return (
    <BackgroundLayer
      className="opacity-[0.018] mix-blend-soft-light"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}
    />
  )
})
NoiseLayer.displayName = 'NoiseLayer'
