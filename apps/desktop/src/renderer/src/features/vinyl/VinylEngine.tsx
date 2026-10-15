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

// Module level variable to preserve rotational phase across view changes and React Strict Mode remounts
let savedVinylPhase = 0

/**
 * On high-refresh displays (120 Hz and up) the record turns in 60 steps a second instead of
 * at the display's rate: it looks the same, and every frame the window does not present
 * saves real CPU and GPU time (measured: Study Room 197% → 135% of a core at 120 Hz).
 * On 60 Hz displays the turn stays continuous.
 */
let highRefresh: boolean | null = null
const highRefreshListeners = new Set<() => void>()
function detectRefresh(): void {
  if (highRefresh !== null || typeof requestAnimationFrame === 'undefined') return
  highRefresh = false
  let attempts = 0
  const measure = (): void => {
    const stamps: number[] = []
    const tick = (t: number): void => {
      stamps.push(t)
      if (stamps.length < 24) {
        requestAnimationFrame(tick)
        return
      }
      // The quickest quarter of frames shows the display's own rate; slower ones are just
      // a busy page. While the page is busy (start-up, a track change) the answer is unclear,
      // so try again later.
      const gaps = stamps.slice(1).map((s, i) => s - stamps[i]).sort((a, b) => a - b)
      const quick = gaps[Math.floor(gaps.length / 4)]
      if (quick < 12) {
        highRefresh = true
        highRefreshListeners.forEach((fn) => fn())
      } else if (quick > 20 && ++attempts < 8) {
        window.setTimeout(measure, 4000)
      }
    }
    requestAnimationFrame(tick)
  }
  window.setTimeout(measure, 2000)
}

function spinEasing(durationMs: number): string {
  return highRefresh ? `steps(${Math.round((durationMs / 1000) * 60)})` : 'linear'
}

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
          easing: spinEasing(1800)
        }
      )
      animationRef.current.currentTime = savedVinylPhase
      animationRef.current.playbackRate = 0
    }

    return () => {
      if (animationRef.current) {
        savedVinylPhase = (animationRef.current.currentTime as number) || 0
        animationRef.current.cancel()
        animationRef.current = null
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!animationRef.current) return
    const targetDuration = rpm === '45' ? 1333.33 : 1800
    const effect = animationRef.current.effect as KeyframeEffect
    const apply = (): void => {
      const current = (animationRef.current?.effect as KeyframeEffect | null) ?? effect
      current?.updateTiming({ duration: targetDuration, easing: spinEasing(targetDuration) })    }
    apply()
    detectRefresh()
    highRefreshListeners.add(apply)
    return (): void => {
      highRefreshListeners.delete(apply)
    }
  }, [rpm])

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
      <div
        className="absolute inset-[2%] rounded-full pointer-events-none"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)'
        }}
      />

      <div
        ref={vinylRef}
        className="absolute inset-0 w-full h-full rounded-full transform-gpu will-change-transform"
      >
        <VinylBase />
        <GrooveLayer />
        <Label albumArt={artwork} />
      </div>

      {/* Light and shadow come from the room, not the record: they stay put while it turns.
          Baked into the turning layer, the rim's highlight and shadow circled round with it
          and the record read as an oval wobbling on the spindle. */}
      <EdgeLayer />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-black/20 via-transparent to-white/[0.05] mix-blend-overlay"
        style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.7)' }}
        aria-hidden="true"
      />
      <ReflectionLayer />
      <Spindle />
    </div>
  )
})

VinylEngine.displayName = 'VinylEngine'
