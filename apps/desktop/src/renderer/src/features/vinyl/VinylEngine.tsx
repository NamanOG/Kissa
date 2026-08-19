import React, { memo, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion'
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
 * Stacks layers: base → grooves → edge → label, with reflection on top.
 */
export const VinylEngine = memo(({ className, albumArt, isActive, ...props }: VinylEngineProps): React.JSX.Element => {
  const storeIsPlaying = usePlayerStore((state) => state.isPlaying)
  const storeIsPowered = usePlayerStore((state) => state.isPowered)
  const rpm = usePlayerStore((state) => state.rpm)
  const storeTrack = usePlayerStore((state) => state.currentTrack)

  const playing = (isActive ?? storeIsPlaying) && storeIsPowered
  const artwork = albumArt ?? storeTrack?.artworkUrl ?? albumPlaceholder

  const rotation = useMotionValue(0)
  const speedRef = useRef(0) // Current deg/s

  // Target speed: 33⅓ RPM = 200 deg/s, 45 RPM = 270 deg/s
  const TARGET_SPEED = rpm === '45' ? 270 : 200

  useAnimationFrame((_, delta) => {
    const deltaSeconds = delta / 1000

    if (playing) {
      // Immediate tactile spin up/down to target RPM
      if (speedRef.current < TARGET_SPEED) {
        speedRef.current = Math.min(TARGET_SPEED, speedRef.current + 650 * deltaSeconds)
      } else if (speedRef.current > TARGET_SPEED) {
        speedRef.current = Math.max(TARGET_SPEED, speedRef.current - 350 * deltaSeconds)
      }
    } else {
      // Crisp smooth spin down with friction
      speedRef.current = Math.max(0, speedRef.current - 450 * deltaSeconds)
    }

    if (speedRef.current > 0) {
      const nextRotation = (rotation.get() + speedRef.current * deltaSeconds) % 360
      rotation.set(nextRotation)
    }
  })

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

      <motion.div
        className="absolute inset-0 w-full h-full rounded-full transform-gpu"
        style={{ rotate: rotation }}
      >
        <VinylBase />
        <GrooveLayer />
        <EdgeLayer />
        <Label albumArt={artwork} />
      </motion.div>

      {/* Reflection stays static (doesn't rotate with vinyl) */}
      <ReflectionLayer />
      <Spindle />
    </div>
  )
})

VinylEngine.displayName = 'VinylEngine'
