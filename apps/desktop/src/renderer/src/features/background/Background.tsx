import { memo } from 'react'
import { GradientLayer } from './GradientLayer'
import { VignetteLayer } from './VignetteLayer'
import { NoiseLayer } from './NoiseLayer'

export const Background = memo(() => {
  return (
    <div className="fixed inset-0 w-screen h-screen -z-50 overflow-hidden bg-transparent">
      <GradientLayer />
      <VignetteLayer />
      <NoiseLayer />
      {/* Environmental Lighting / Room Dimmer Layer */}
      <div 
        className="absolute inset-0 pointer-events-none bg-black transition-opacity duration-75 z-10"
        style={{ opacity: 'calc(1 - var(--room-illumination, 1))' }} 
      />
    </div>
  )
})

Background.displayName = 'Background'
