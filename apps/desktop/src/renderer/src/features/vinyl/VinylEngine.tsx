import React, { memo, useEffect, useRef } from 'react'
import { cn } from '@renderer/utils/cn'
import { VinylEngineProps } from './types'
import { VinylBase } from './VinylBase'
import { GrooveLayer } from './GrooveLayer'
import { ReflectionLayer } from './ReflectionLayer'
import { EdgeLayer } from './EdgeLayer'
import { Label } from './Label'
import { Spindle } from './Spindle'
import { usePlayerStore } from '@renderer/stores/playerStore'

import albumPlaceholder from '@renderer/media/placeholder-album.png'

/**
 * Vinyl record engine — handles spin animation with real physics
 * (acceleration on play, friction deceleration on pause).
 * Steady-state rotation is offloaded to the compositor via WAAPI.
 */
export const VinylEngine = memo(({ className, albumArt, isActive, ...props }: VinylEngineProps): React.JSX.Element => {
  const storeIsPlaying = usePlayerStore((state) => state.isPlaying)
  const storeIsPowered = usePlayerStore((state) => state.isPowered)
  const rpm = usePlayerStore((state) => state.rpm)
  const storeTrack = usePlayerStore((state) => state.currentTrack)

  const playing = (isActive ?? storeIsPlaying) && storeIsPowered
  const artwork = albumArt ?? storeTrack?.artworkUrl ?? albumPlaceholder

  const vinylRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<Animation | null>(null)
  const rafRef = useRef<number | null>(null)
  const currentPlaybackRateRef = useRef(0)

// Module level variable to preserve rotational phase across view changes and React Strict Mode remounts
let savedVinylPhase = 0

  // Initialize Web Animations API rotation
  useEffect(() => {
    if (!vinylRef.current) return
    
    if (!animationRef.current) {
      animationRef.current = vinylRef.current.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ],
        {
          duration: 1800, // 33 1/3 RPM default (1.8s per rev)
          iterations: Infinity,
          easing: 'linear'
        }
      )
      animationRef.current.currentTime = savedVinylPhase
      animationRef.current.playbackRate = 0
    }

    return () => {
      if (animationRef.current) {
        // Save the exact rotational phase before cancelling
        savedVinylPhase = (animationRef.current.currentTime as number) || 0
        animationRef.current.cancel()
        animationRef.current = null
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Handle RPM changes by updating animation duration smoothly
  useEffect(() => {
    if (!animationRef.current) return
    const targetDuration = rpm === '45' ? 1333.33 : 1800
    const effect = animationRef.current.effect as KeyframeEffect
    if (effect) {
      effect.updateTiming({ duration: targetDuration })
    }
  }, [rpm])

  // Handle play/pause physics via playbackRate interpolation
  useEffect(() => {
    if (!animationRef.current) return
    
    const targetRate = playing ? 1 : 0
    let lastTime = performance.now()
    
    const updateRate = (time: number) => {
      const deltaSeconds = (time - lastTime) / 1000
      lastTime = time
      
      let rate = currentPlaybackRateRef.current
      if (playing && rate < targetRate) {
        rate = Math.min(targetRate, rate + 3.25 * deltaSeconds) // Spin up
      } else if (!playing && rate > targetRate) {
        rate = Math.max(targetRate, rate - 2.25 * deltaSeconds) // Spin down
      }
      
      currentPlaybackRateRef.current = rate
      
      if (animationRef.current) {
        animationRef.current.playbackRate = rate
      }
      
      if (rate !== targetRate) {
        rafRef.current = requestAnimationFrame(updateRate)
      }
    }
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateRate)
    
  }, [playing])

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'w-full aspect-square',
        className
      )}
      {...props}
    >
      {/* Vinyl drop shadow — creates "sitting on platter" depth */}
      <div
        className="absolute inset-[2%] rounded-full pointer-events-none"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)'
        }}
      />

      <div
        ref={vinylRef}
        className="absolute inset-0 w-full h-full rounded-full transform-gpu"
      >
        <VinylBase />
        <GrooveLayer />
        <EdgeLayer />
        <Label albumArt={artwork} />
      </div>

      {/* Reflection stays static (doesn't rotate with vinyl) */}
      <ReflectionLayer />
      <Spindle />
    </div>
  )
})

VinylEngine.displayName = 'VinylEngine'
