import React, { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'

export interface TonearmAssemblyProps {
  className?: string
  style?: React.CSSProperties
}

const REST_ANGLE = 0
const OUTER_GROOVE_ANGLE = 23.0
const INNER_GROOVE_ANGLE = 39.5

/**
 * Precision Audiophile Tonearm Assembly.
 * Minimalist, high-end industrial design inspired by Braun / Technics / Dieter Rams.
 * Features fluid inertia interpolation, needle drop/lift depth, and localized draggable hitbox.
 */
export const TonearmAssembly = memo(({ className, style }: TonearmAssemblyProps): React.JSX.Element => {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  const duration = usePlayerStore((state) =>
    state.currentTrack?.duration && state.currentTrack.duration > 0 ? state.currentTrack.duration : 210
  )
  const [isDragging, setIsDragging] = useState(false)
  
  const tonearmContainerRef = useRef<HTMLDivElement>(null)
  const tonearmRef = useRef<HTMLDivElement>(null)

  const activePlayback = isPlaying && isPowered

  const dragAngleRef = useRef<number>(REST_ANGLE)
  const armStateRef = useRef<'RESTING' | 'MOVING_TO_RECORD' | 'LOWERING' | 'PLAYING' | 'LIFTING' | 'RETURNING' | 'SWEEPING'>('RESTING')
  const armAngleRef = useRef<number>(REST_ANGLE)
  const armScaleRef = useRef<number>(1.015)
  const transitionStartRef = useRef<number>(0)
  const startAngleRef = useRef<number>(REST_ANGLE)
  const startScaleRef = useRef<number>(1.015)

  const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  // High-precision RAF loop for perfectly smooth groove tracking & physical state machine
  useEffect(() => {
    let rafId: number

    const updateRotation = (timestamp: DOMHighResTimeStamp) => {
      if (!tonearmRef.current) {
        rafId = 0
        return
      }

      if (isDragging) {
        // Drag logic handles the visual update directly, but we sync our refs
        armAngleRef.current = dragAngleRef.current
        armScaleRef.current = 1.015 // lifted while dragging
        armStateRef.current = 'LIFTING'
        rafId = requestAnimationFrame(updateRotation)
        return
      }

      const state = usePlayerStore.getState()
      const physicalFeedback = state.physicalFeedback
      const isPaused = !state.isPlaying && state.isPowered
      const isStopped = !state.isPowered || (!state.isPlaying && state.progress === 0)
      const isPlayingActive = state.isPlaying && state.isPowered

      const rawDur = state.currentTrack?.duration
      const dur = rawDur && rawDur > 0 ? rawDur : 210
      const time = PlaybackClock.getCurrentTime()
      const ratio = Math.min(1, Math.max(0, time / dur))
      const targetGrooveAngle = OUTER_GROOVE_ANGLE + ratio * (INNER_GROOVE_ANGLE - OUTER_GROOVE_ANGLE)

      // ─── STATE MACHINE TRANSITIONS ───
      if (isPlayingActive && (armStateRef.current === 'RESTING' || armStateRef.current === 'RETURNING')) {
        armStateRef.current = 'MOVING_TO_RECORD'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      } else if (isPlayingActive && armStateRef.current === 'LIFTING') { 
        armStateRef.current = 'LOWERING'
        transitionStartRef.current = timestamp
        startScaleRef.current = armScaleRef.current
      } else if ((isPaused || isStopped) && ['PLAYING', 'LOWERING', 'MOVING_TO_RECORD', 'LIFTING', 'SWEEPING'].includes(armStateRef.current)) {
        armStateRef.current = 'RETURNING'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      }

      // ─── STATE LOGIC ───
      let nextAngle = armAngleRef.current
      let nextScale = armScaleRef.current

      if (armStateRef.current === 'MOVING_TO_RECORD') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 600)
        nextAngle = startAngleRef.current + (targetGrooveAngle - startAngleRef.current) * easeInOutCubic(progress)
        nextScale = 1.015 // stay lifted while moving
        if (progress >= 1) {
          armStateRef.current = 'LOWERING'
          transitionStartRef.current = timestamp
          startScaleRef.current = nextScale
        }
      } else if (armStateRef.current === 'LOWERING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 250)
        nextAngle = targetGrooveAngle
        nextScale = startScaleRef.current + (1.0 - startScaleRef.current) * progress
        if (progress >= 1) {
          armStateRef.current = 'PLAYING'
        }
      } else if (armStateRef.current === 'PLAYING') {
        nextAngle = targetGrooveAngle
        nextScale = 1.0
      } else if (armStateRef.current === 'LIFTING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 250)
        nextScale = startScaleRef.current + (1.015 - startScaleRef.current) * progress
        // Stay over the groove
      } else if (armStateRef.current === 'RETURNING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 1100)
        // Authentic physical mechanical deceleration: smooth start, graceful traversal, and gentle rest settle
        const easeDecel = 1 - Math.pow(1 - progress, 3)
        nextAngle = startAngleRef.current + (REST_ANGLE - startAngleRef.current) * easeDecel
        
        // Lift gracefully during initial return motion
        const scaleProgress = Math.min(1, (timestamp - transitionStartRef.current) / 320)
        nextScale = startScaleRef.current + (1.015 - startScaleRef.current) * scaleProgress

        if (progress >= 1) {
          armStateRef.current = 'RESTING'
        }
      } else if (armStateRef.current === 'RESTING') {
        nextAngle = REST_ANGLE
        nextScale = 1.015
      } else if (armStateRef.current === 'SWEEPING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 300)
        nextAngle = startAngleRef.current + (targetGrooveAngle - startAngleRef.current) * easeInOutCubic(progress)
        nextScale = 1.0 // remain lowered
        if (progress >= 1) {
          armStateRef.current = 'PLAYING'
        }
      }

      armAngleRef.current = nextAngle
      armScaleRef.current = nextScale

      const scaleStr = physicalFeedback ? nextScale : 1.0
      tonearmRef.current.style.transition = 'none'
      tonearmRef.current.style.transform = `rotate(${nextAngle}deg) scale(${scaleStr})`
      
      const isResting = armStateRef.current === 'RESTING'
      const isRestPosition = nextAngle === REST_ANGLE && nextScale === 1.015
      if (isResting && isRestPosition && !isDragging && !isPlayingActive) {
        rafId = 0
        return
      }

      rafId = requestAnimationFrame(updateRotation)
    }

    rafId = requestAnimationFrame(updateRotation)

    // Listen for manual seeks (from external sources) to snap tonearm smoothly
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (!isDragging && Math.abs(state.progress - prevState.progress) > 1.5) {
        if (state.isPlaying && state.isPowered && armStateRef.current === 'PLAYING') {
          armStateRef.current = 'SWEEPING'
          transitionStartRef.current = performance.now()
          startAngleRef.current = armAngleRef.current
        }
      }

      if (!rafId && !isDragging) {
        if (
          state.isPlaying !== prevState.isPlaying ||
          state.isPowered !== prevState.isPowered ||
          state.progress !== prevState.progress
        ) {
          rafId = requestAnimationFrame(updateRotation)
        }
      }
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      unsubscribe()
    }
  }, [isDragging])

  const dragContextRef = useRef<{ startMouseAngle: number; startArmAngle: number } | null>(null)

  const getMouseAngle = (clientX: number, clientY: number): number | null => {
    if (!tonearmContainerRef.current) return null
    const rect = tonearmContainerRef.current.getBoundingClientRect()
    const pivotX = rect.left + rect.width * (115 / 160)
    const pivotY = rect.top + rect.height * (36 / 420)
    return Math.atan2(clientY - pivotY, clientX - pivotX) * (180 / Math.PI)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    
    const mouseAngle = getMouseAngle(event.clientX, event.clientY) ?? 0
    dragContextRef.current = {
      startMouseAngle: mouseAngle,
      startArmAngle: dragAngleRef.current
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isDragging || !tonearmRef.current || !dragContextRef.current) return
    const mouseAngle = getMouseAngle(event.clientX, event.clientY)
    if (mouseAngle === null) return
    
    let angleDelta = mouseAngle - dragContextRef.current.startMouseAngle
    while (angleDelta > 180) angleDelta -= 360
    while (angleDelta < -180) angleDelta += 360
    
    const newAngle = dragContextRef.current.startArmAngle + angleDelta
    const clampedAngle = Math.max(-2, Math.min(42, newAngle))
    dragAngleRef.current = clampedAngle
    
    tonearmRef.current.style.transition = 'none'
    tonearmRef.current.style.transform = `rotate(${clampedAngle}deg)`
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isDragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragContextRef.current = null
    setIsDragging(false)

    const angle = dragAngleRef.current
    const state = usePlayerStore.getState()
    const isExternal = !!state.currentTrack?.sourceAppId
    
    if (angle < 9) {
      if (!isExternal) state.setProgress(0)
      state.pause()
      if (isExternal && window.electron?.mediaPlayPause && isPlaying) {
        void window.electron.mediaPlayPause()
      }
    } else {
      const clamped = Math.max(OUTER_GROOVE_ANGLE, Math.min(INNER_GROOVE_ANGLE, angle))
      const ratio = (clamped - OUTER_GROOVE_ANGLE) / (INNER_GROOVE_ANGLE - OUTER_GROOVE_ANGLE)
      const activeDur = state.currentTrack?.duration && state.currentTrack.duration > 0 ? state.currentTrack.duration : 210
      const seekTime = Math.round(ratio * activeDur)
      
      if (!isExternal) {
        state.setProgress(seekTime)
      }
      
      if (!state.isPlaying) {
        state.play()
        if (isExternal && window.electron?.mediaPlayPause) {
          void window.electron.mediaPlayPause()
        }
      }
    }
  }

  return (
    <div
      className={cn('absolute z-30 pointer-events-none select-none onboarding-tonearm', className)}
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
      <div ref={tonearmContainerRef} className="absolute inset-0 pointer-events-none">
        <div
          ref={tonearmRef}
          className="relative h-full w-full pointer-events-none transform-gpu"
          style={{
            transformOrigin: '72% 8.5%',
            touchAction: 'none',
            willChange: 'transform'
          }}
        >
          <div
            className="h-full w-full transform-gpu"
            style={{
              transformOrigin: '72% 8.5%',
              transform: `scale(${isDragging ? 1.025 : (usePlayerStore.getState().physicalFeedback ? (activePlayback ? 1.0 : 1.015) : 1)})`,
              transition: 'transform var(--duration-ui) var(--ease-out)'
            }}
          >
            <svg
              viewBox="0 0 160 420"
              className="h-full w-full overflow-visible pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                {/* Polished aerospace-grade titanium-chrome arm tube */}
                <linearGradient id="tonearm-tube-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#241d18" />
                  <stop offset="10%" stopColor="#7a6c5f" />
                  <stop offset="26%" stopColor="#ded6cb" />
                  <stop offset="42%" stopColor="#ffffff" />
                  <stop offset="58%" stopColor="#ffffff" />
                  <stop offset="74%" stopColor="#c8beaf" />
                  <stop offset="90%" stopColor="#685b4f" />
                  <stop offset="100%" stopColor="#1a1411" />
                </linearGradient>

                {/* Gimbal bearing ring */}
                <radialGradient id="gimbal-ring" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#78685c" />
                  <stop offset="45%" stopColor="#362c26" />
                  <stop offset="85%" stopColor="#1c1613" />
                  <stop offset="100%" stopColor="#0e0b09" />
                </radialGradient>

                {/* Machined brass / champagne gold counterweight with high-gloss luster */}
                <linearGradient id="counterweight-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#543e2a" />
                  <stop offset="25%" stopColor="#caa474" />
                  <stop offset="48%" stopColor="#fff3db" />
                  <stop offset="65%" stopColor="#d7a76c" />
                  <stop offset="85%" stopColor="#9c7244" />
                  <stop offset="100%" stopColor="#3d2a1a" />
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
              
              {/* Anti-skate hanging weight mechanism */}
              <line x1="126" y1="14" x2="134" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <line x1="134" y1="14" x2="134" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <rect x="132" y="18" width="4" height="7" rx="1.5" fill="url(#counterweight-metal)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />

              {/* ── 2. Gimbal Bearing Pivot Center (cx: 115, cy: 36) ── */}
              {/* Base Contact Shadow */}
              <circle cx="115" cy="36.5" r="23" fill="rgba(0,0,0,0.6)" filter="blur(2px)" />
              {/* Outer Mounting Surface */}
              <circle cx="115" cy="36" r="22" fill="#140f0c" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
              <circle cx="115" cy="36" r="21" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="1" />
              
              {/* Main Gimbal Housing */}
              <circle cx="115" cy="36" r="18" fill="url(#gimbal-ring)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
              {/* Pivot Ring */}
              <circle cx="115" cy="36" r="11" fill="#1b1512" stroke="url(#tonearm-tube-metal)" strokeWidth="2.5" />
              {/* Top Bearing Cap */}
              <circle cx="115" cy="36" r="4.5" fill="#e8dfd5" stroke="#120e0b" strokeWidth="1.2" />

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
                strokeWidth="6.5"
                strokeLinecap="round"
              />
              {/* Top specular reflection line */}
              <path
                d="M 113.8 54 L 113.8 176 C 112.8 256 108.8 282 63 333"
                fill="none"
                stroke="rgba(255,255,255,0.65)"
                strokeWidth="0.85"
                strokeLinecap="round"
              />
              {/* Secondary ambient catchlight (right edge) */}
              <path
                d="M 116.5 54 L 116.5 176 C 115.5 256 111.5 282 66 333"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.5"
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
                  x="36"
                  y="377"
                  width="16"
                  height="17"
                  rx="1.5"
                  fill="#181310"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.75"
                />
                {/* 4 physical mounting screws */}
                <circle cx="39" cy="380" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
                <circle cx="49" cy="380" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
                <circle cx="39" cy="391" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
                <circle cx="49" cy="391" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />

                {/* Champagne accent strip */}
                <rect x="36" y="388" width="16" height="3" rx="0.75" fill="#d7a76c" />
                
                {/* Stylus Cantilever & Diamond Tip */}
                <line x1="44" y1="394" x2="44.5" y2="402" stroke="#e5dfd6" strokeWidth="1.2" strokeLinecap="round" />
                {/* Diamond tip with micro-shadow instead of glow */}
                <circle cx="44.5" cy="402.5" r="1.1" fill="#ffffff" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.8))" />

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
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={cn(
                'absolute cursor-grab active:cursor-grabbing pointer-events-auto rounded-full',
                'transition-transform active:scale-95'
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
          </div>
        </div>
      </div>
    </div>
  )
})

TonearmAssembly.displayName = 'TonearmAssembly'
