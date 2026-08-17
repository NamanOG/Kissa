import React, { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'

export interface TonearmAssemblyProps {
  className?: string
  style?: React.CSSProperties
}

const REST_ANGLE = 0
const OUTER_GROOVE_ANGLE = 16.5
const INNER_GROOVE_ANGLE = 27.5

/**
 * Precision Audiophile Tonearm Assembly.
 * Minimalist, high-end industrial design inspired by Braun / Technics / Dieter Rams.
 * Features fluid inertia interpolation, needle drop/lift depth, and localized draggable hitbox.
 */
export const TonearmAssembly = memo(({ className, style }: TonearmAssemblyProps): React.JSX.Element => {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.currentTrack?.duration || 1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragAngle, setDragAngle] = useState<number | null>(null)
  const tonearmRef = useRef<HTMLDivElement>(null)

  const activePlayback = isPlaying && isPowered
  const playbackRatio = duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0
  const playbackAngle = OUTER_GROOVE_ANGLE + playbackRatio * (INNER_GROOVE_ANGLE - OUTER_GROOVE_ANGLE)
  const targetAngle = isDragging
    ? (dragAngle ?? REST_ANGLE)
    : activePlayback
      ? playbackAngle
      : REST_ANGLE

  const updateAngleFromPointer = (clientX: number, clientY: number): void => {
    if (!tonearmRef.current) return
    const rect = tonearmRef.current.getBoundingClientRect()
    // Pivot center relative to viewport
    const pivotX = rect.left + rect.width * 0.72
    const pivotY = rect.top + rect.height * 0.085
    const dx = clientX - pivotX
    const dy = Math.max(1, clientY - pivotY)
    const angle = Math.atan2(-dx, dy) * (180 / Math.PI)
    // Clamp between -2deg (rest) and 32deg (inner label)
    setDragAngle(Math.max(-2, Math.min(32, angle)))
  }

  const handlePointerDown = (event: React.PointerEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setIsDragging(true)
    updateAngleFromPointer(event.clientX, event.clientY)
  }

  useEffect(() => {
    if (!isDragging) return
    const handlePointerMove = (e: PointerEvent): void => {
      updateAngleFromPointer(e.clientX, e.clientY)
    }

    const handlePointerUp = (): void => {
      const angle = dragAngle ?? REST_ANGLE
      const state = usePlayerStore.getState()
      setIsDragging(false)
      if (angle < 9) {
        state.pause()
        state.setProgress(0)
        if (state.currentTrack?.sourceAppId && window.electron?.mediaPlayPause && isPlaying) {
          void window.electron.mediaPlayPause()
        }
      } else {
        const clamped = Math.max(OUTER_GROOVE_ANGLE, Math.min(INNER_GROOVE_ANGLE, angle))
        const ratio = (clamped - OUTER_GROOVE_ANGLE) / (INNER_GROOVE_ANGLE - OUTER_GROOVE_ANGLE)
        state.setProgress(Math.round(ratio * duration))
        if (!state.isPlaying) {
          state.play()
          if (state.currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
            void window.electron.mediaPlayPause()
          }
        }
      }
      setDragAngle(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return (): void => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragAngle, duration, isDragging, isPlaying])

  return (
    <div
      className={cn('absolute z-30 pointer-events-none select-none', className)}
      style={style}
    >
      {/* ── Fixed Plinth Arm-Rest & Cue Base ── */}
      <svg
        viewBox="0 0 160 420"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="base-gimbal-well" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2c2420" />
            <stop offset="60%" stopColor="#171210" />
            <stop offset="100%" stopColor="#0a0807" />
          </radialGradient>
          <linearGradient id="rest-clip-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#483e38" />
            <stop offset="50%" stopColor="#2a221d" />
            <stop offset="100%" stopColor="#15100e" />
          </linearGradient>
        </defs>

        {/* Outer Plinth Pivot Well */}
        <circle cx="115" cy="36" r="28" fill="url(#base-gimbal-well)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <circle cx="115" cy="36" r="27" fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="2" />

        {/* Minimalist Tonearm Rest Post & Cradle (Rest position at ~x:115, y:230) */}
        <rect x="111" y="210" width="8" height="24" rx="2" fill="url(#rest-clip-metal)" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
        <path d="M 107 220 L 123 220 L 123 224 L 107 224 Z" fill="#120e0c" />
        <circle cx="115" cy="222" r="1.5" fill="#d7a76c" opacity={activePlayback ? 0.3 : 0.8} />
      </svg>

      {/* ── Rotating Tonearm Assembly (Pivot at 72% X, 8.5% Y) ── */}
      <motion.div
        ref={tonearmRef}
        className="relative h-full w-full pointer-events-none transform-gpu"
        style={{
          transformOrigin: '72% 8.5%',
          touchAction: 'none',
          willChange: 'transform'
        }}
        animate={{
          rotate: targetAngle,
          // Subtle Z-elevation & needle drop contact depth
          scale: isDragging ? 1.025 : activePlayback ? 1.0 : 1.015,
          filter: isDragging
            ? 'drop-shadow(-8px 16px 18px rgba(10,6,4,0.65))'
            : activePlayback
              ? 'drop-shadow(-4px 8px 10px rgba(10,6,4,0.45))'
              : 'drop-shadow(-6px 12px 14px rgba(10,6,4,0.55))'
        }}
        transition={
          isDragging
            ? { duration: 0 }
            : activePlayback
              ? {
                  rotate: { duration: 0.9, ease: 'linear' },
                  scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                }
              : {
                  rotate: { duration: 0.75, ease: [0.25, 1, 0.35, 1] },
                  scale: { duration: 0.5, ease: [0.25, 1, 0.35, 1] }
                }
        }
      >
        <svg
          viewBox="0 0 160 420"
          className="h-full w-full overflow-visible pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Satin brushed titanium-aluminum arm tube */}
            <linearGradient id="tonearm-tube-metal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#453d37" />
              <stop offset="25%" stopColor="#c5b7aa" />
              <stop offset="48%" stopColor="#f5efe6" />
              <stop offset="70%" stopColor="#9e9185" />
              <stop offset="100%" stopColor="#38302b" />
            </linearGradient>

            {/* Gimbal bearing ring */}
            <radialGradient id="gimbal-ring" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60534a" />
              <stop offset="50%" stopColor="#2c241f" />
              <stop offset="100%" stopColor="#140f0d" />
            </radialGradient>

            {/* Machined brass / champagne gold counterweight */}
            <linearGradient id="counterweight-metal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#684f36" />
              <stop offset="35%" stopColor="#e4c399" />
              <stop offset="65%" stopColor="#b38f65" />
              <stop offset="100%" stopColor="#4a3723" />
            </linearGradient>
          </defs>

          {/* ── 1. Rear Counterweight & Stub ── */}
          {/* Rear stub extending backward */}
          <rect x="112.5" y="8" width="5" height="18" rx="2" fill="url(#tonearm-tube-metal)" />
          {/* Main cylindrical knurled counterweight */}
          <rect x="104" y="6" width="22" height="14" rx="3.5" fill="url(#counterweight-metal)" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
          {/* Weight calibration ring lines */}
          <line x1="104" y1="11" x2="126" y2="11" stroke="rgba(0,0,0,0.5)" strokeWidth="0.75" />
          <line x1="104" y1="15" x2="126" y2="15" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />

          {/* ── 2. Gimbal Bearing Pivot Center (cx: 115, cy: 36) ── */}
          <circle cx="115" cy="36" r="19" fill="url(#gimbal-ring)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <circle cx="115" cy="36" r="12" fill="#1b1512" stroke="url(#tonearm-tube-metal)" strokeWidth="2.5" />
          <circle cx="115" cy="36" r="4.5" fill="#f5efe6" stroke="#251d18" strokeWidth="1" />

          {/* ── 3. Precision Tapered Satin Arm Tube ── */}
          {/* Outer shadow core */}
          <path
            d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358"
            fill="none"
            stroke="#120e0c"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          {/* Satin metal tube body */}
          <path
            d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358"
            fill="none"
            stroke="url(#tonearm-tube-metal)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Top specular reflection line */}
          <path
            d="M 113.8 54 L 113.8 176 C 112.8 256 108.8 282 63 333"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.85"
            strokeLinecap="round"
          />

          {/* ── 4. Minimalist Headshell & Cartridge ── */}
          <g transform="rotate(22 46 360)">
            {/* Anodized Headshell Mounting Block */}
            <path
              d="M 38 354 L 54 354 L 51 382 L 35 382 Z"
              fill="#261f1b"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.8"
            />
            {/* Precision Cartridge Body (e.g., Audio-Technica / Ortofon style) */}
            <rect
              x="37"
              y="378"
              width="14"
              height="15"
              rx="1.5"
              fill="#181310"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.75"
            />
            {/* Champagne accent strip */}
            <rect x="37" y="388" width="14" height="3" rx="0.75" fill="#d7a76c" />
            {/* Stylus Cantilever & Diamond Tip */}
            <line x1="44" y1="392" x2="44.5" y2="402" stroke="#f5efe6" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="44.5" cy="402.5" r="1.1" fill="#ffe2b8" />

            {/* Finger Cue Lift Lever (extends right for intuitive grabbing) */}
            <path
              d="M 52 360 C 58 358 64 362 66 368"
              fill="none"
              stroke="url(#tonearm-tube-metal)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* ── Interactive Draggable Hitbox (Constrained to the arm & headshell area only) ── */}
        <div
          onPointerDown={handlePointerDown}
          className={cn(
            'absolute cursor-grab active:cursor-grabbing pointer-events-auto rounded-full',
            'transition-transform hover:scale-105 active:scale-95'
          )}
          style={{
            left: '12%',
            top: '70%',
            width: '45%',
            height: '28%',
            touchAction: 'none'
          }}
          title="Drag tonearm to drop needle & seek"
          aria-label="Tonearm cue handle. Drag to seek across vinyl record grooves."
        />
      </motion.div>
    </div>
  )
})

TonearmAssembly.displayName = 'TonearmAssembly'
