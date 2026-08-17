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
    </div>
  )
})

Background.displayName = 'Background'
