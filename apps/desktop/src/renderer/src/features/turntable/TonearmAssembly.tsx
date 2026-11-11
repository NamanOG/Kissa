import React, { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { needleContact, needleLift, registerTonearm } from '@renderer/utils/needleSounds'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { useT } from '@renderer/i18n'
import { geometryFromBoxes, grooveAngles, HEADSHELL_DEG } from './armGeometry'

export interface TonearmAssemblyProps {
  className?: string
  style?: React.CSSProperties
}

const REST_ANGLE = 0
// Where the stylus meets the record is worked out from the drawing (armGeometry.ts): the arm's
// pivot, the stylus tip and the record's own radius, measured flat on the laid-out deck at mount
// and on every resize, so each deck size (Deck, Party, fullscreen) gets its own exact angles.
// Until then (and in tests), the angles measured on the 5.1 deck: the lead-in just inside the
// record's edge and the run-out just outside the label. (17.5° put the stylus off the record; it
// was measured against the platter's radius on a tilted deck.)
const FALLBACK_ANGLES = { outer: 18.4, inner: 37.5 }

/** The arm's angle for a place in the song: the lead-in at its start, the run-out at its end. */
export function grooveAngle(
  time: number,
  duration: number | undefined,
  outer = FALLBACK_ANGLES.outer,
  inner = FALLBACK_ANGLES.inner
): number {
  const ratio = duration && duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
  return outer + ratio * (inner - outer)
}
/**
 * Experiment: a tiny cue light at the stylus and a faint pool of it on the grooves, in the room's
 * (album's) colour lifted towards white so it never reads as neon. Only while the record plays.
 * One switch, so it can be removed or turned into a setting.
 */
export const NEEDLE_LIGHT = true
/** The light's colour: the room accent, softened. Falls back to a warm white. */
const NEEDLE_LIGHT_COLOUR = 'color-mix(in srgb, var(--accent, #f4e3c8) 55%, #fff6ea)'

/**
 * Tonearm assembly, drawn as modern hardware: a slim aluminium tube, a plain cylindrical
 * counterweight, a slim cue lever and a clean armboard, each with one fine highlight.
 * Features fluid inertia interpolation, needle drop/lift depth, and localized draggable hitbox.
 */
export const TonearmAssembly = memo(({ className, style }: TonearmAssemblyProps): React.JSX.Element => {
  const t = useT()
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  const duration = usePlayerStore((state) =>
    state.currentTrack?.duration && state.currentTrack.duration > 0 ? state.currentTrack.duration : 210
  )
  const [isDragging, setIsDragging] = useState(false)
  
  const tonearmContainerRef = useRef<HTMLDivElement>(null)
  const tonearmRef = useRef<HTMLDivElement>(null)
  // The needle light follows the stylus itself: on once it has landed, off as the arm lifts.
  const needleLightRef = useRef<SVGGElement>(null)
  const needleLitRef = useRef(false)

  const activePlayback = isPlaying && isPowered

  const dragAngleRef = useRef<number>(REST_ANGLE)
  const armStateRef = useRef<'RESTING' | 'MOVING_TO_RECORD' | 'LOWERING' | 'PLAYING' | 'LIFTING' | 'RETURNING' | 'SWEEPING'>('RESTING')
  const armAngleRef = useRef<number>(REST_ANGLE)
  const lastTransformRef = useRef<string>('')
  const armScaleRef = useRef<number>(1.015)
  const transitionStartRef = useRef<number>(0)
  const startAngleRef = useRef<number>(REST_ANGLE)
  const startScaleRef = useRef<number>(1.015)
  // A new song: its position, length and place on the side arrive over a moment. The arm
  // holds still until then and moves once, instead of jumping with each piece.
  const holdUntilRef = useRef<number>(0)
  // The lead-in and run-out angles for this deck as laid out (see armGeometry.ts).
  const anglesRef = useRef(FALLBACK_ANGLES)

  // Measure the deck flat: the arm turns in the deck's own plane, which is tilted on screen, so the
  // tilt is cleared for the length of one synchronous read (no frame is drawn in between).
  useEffect(() => {
    const measure = (): void => {
      const container = tonearmContainerRef.current
      const plinth = container?.closest<HTMLElement>('[data-deck-plinth]')
      const record = plinth?.querySelector<HTMLElement>('[data-vinyl-record]')
      if (!container || !plinth || !record) return
      const saved = plinth.style.transform
      plinth.style.transform = 'none'
      const g = geometryFromBoxes(container.getBoundingClientRect(), record.getBoundingClientRect())
      plinth.style.transform = saved
      if (g) anglesRef.current = grooveAngles(g)
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (tonearmContainerRef.current) ro?.observe(tonearmContainerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // While this arm is on screen it decides when the needle is heard: at its visible landing
  // and departure (utils/needleSounds).
  useEffect(() => registerTonearm(), [])

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
      // Turning the record over between sides: the arm goes home and waits.
      const sides = useSidesStore.getState()
      const isPaused = (!state.isPlaying || sides.flipping) && state.isPowered
      const isStopped = !state.isPowered || (!state.isPlaying && state.progress === 0)
      const isPlayingActive = state.isPlaying && state.isPowered && !sides.flipping

      const rawDur = state.currentTrack?.duration
      const time = PlaybackClock.getCurrentTime()
      // The needle travels the song playing: the outer groove at its start, the label at its end.
      // (Travelling the whole side put the arm near the label at the start of a side's last
      // song, which read as a fault.) With no length yet it waits at the outer groove.
      const { outer: OUTER, inner: INNER } = anglesRef.current
      const targetGrooveAngle = grooveAngle(time, rawDur, OUTER, INNER)

      if (isPlayingActive && (armStateRef.current === 'RESTING' || armStateRef.current === 'RETURNING')) {
        armStateRef.current = 'MOVING_TO_RECORD'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      } else if (isPlayingActive && armStateRef.current === 'LIFTING') {
        armStateRef.current = 'LOWERING'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      } else if ((isStopped || sides.flipping) && ['PLAYING', 'LOWERING', 'MOVING_TO_RECORD', 'LIFTING', 'SWEEPING'].includes(armStateRef.current)) {
        // Stopped, or the record being turned over: the stylus leaves the groove and the arm
        // goes home (silent if it never landed).
        needleLift()
        armStateRef.current = 'RETURNING'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      } else if (isPaused && ['PLAYING', 'LOWERING', 'MOVING_TO_RECORD', 'SWEEPING'].includes(armStateRef.current)) {
        // Paused: the stylus lifts off the groove and the arm holds where it is, ready to drop
        // back in the same place.
        needleLift()
        armStateRef.current = 'LIFTING'
        transitionStartRef.current = timestamp
        startAngleRef.current = armAngleRef.current
        startScaleRef.current = armScaleRef.current
      }

      let nextAngle = armAngleRef.current
      let nextScale = armScaleRef.current

      if (armStateRef.current === 'MOVING_TO_RECORD') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 600)
        nextAngle = startAngleRef.current + (targetGrooveAngle - startAngleRef.current) * easeInOutCubic(progress)
        nextScale = 1.015 // stay lifted while moving
        if (progress >= 1) {
          armStateRef.current = 'LOWERING'
          transitionStartRef.current = timestamp
          startAngleRef.current = nextAngle
          startScaleRef.current = nextScale
        }
      } else if (armStateRef.current === 'LOWERING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 250)
        nextAngle = startAngleRef.current + (targetGrooveAngle - startAngleRef.current) * easeInOutCubic(progress)
        nextScale = startScaleRef.current + (1.0 - startScaleRef.current) * progress
        if (progress >= 1) {
          armStateRef.current = 'PLAYING'
          // The stylus touches the record at the end of the lowering.
          needleContact()
        }
      } else if (armStateRef.current === 'PLAYING') {
        nextScale = 1.0
        if (timestamp < holdUntilRef.current) {
          // Settling on a new song: stay put.
          nextAngle = armAngleRef.current
        } else if (Math.abs(targetGrooveAngle - armAngleRef.current) > 0.35) {
          // Anything more than the groove's own creep (a new song, a seek, the side's place
          // arriving): lift, glide and set down rather than snap.
          armStateRef.current = 'SWEEPING'
          transitionStartRef.current = timestamp
          startAngleRef.current = armAngleRef.current
          nextAngle = armAngleRef.current
        } else {
          nextAngle = targetGrooveAngle
        }
      } else if (armStateRef.current === 'LIFTING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 250)
        nextScale = startScaleRef.current + (1.015 - startScaleRef.current) * progress
      } else if (armStateRef.current === 'RETURNING') {
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / 1100)
        // Authentic physical mechanical deceleration: smooth start, graceful traversal, and gentle rest settle
        const easeDecel = 1 - Math.pow(1 - progress, 3)
        nextAngle = startAngleRef.current + (REST_ANGLE - startAngleRef.current) * easeDecel
        
        const scaleProgress = Math.min(1, (timestamp - transitionStartRef.current) / 320)
        nextScale = startScaleRef.current + (1.015 - startScaleRef.current) * scaleProgress

        if (progress >= 1) {
          armStateRef.current = 'RESTING'
        }
      } else if (armStateRef.current === 'RESTING') {
        nextAngle = REST_ANGLE
        nextScale = 1.015
      } else if (armStateRef.current === 'SWEEPING') {
        // Longer for a longer way: 0.45 s for a nudge, up to 0.9 s across the record.
        const span = Math.abs(targetGrooveAngle - startAngleRef.current)
        // Up to 0.7 s across the whole record (a song change), shorter for a nudge.
        const sweepMs = 300 + Math.min(1, span / Math.max(1, INNER - OUTER)) * 400
        const progress = Math.min(1, (timestamp - transitionStartRef.current) / sweepMs)
        nextAngle = startAngleRef.current + (targetGrooveAngle - startAngleRef.current) * easeInOutCubic(progress)
        // The arm rises a little off the record on the way and settles back down.
        nextScale = 1.0 + 0.015 * Math.sin(Math.PI * progress)
        if (progress >= 1) {
          armStateRef.current = 'PLAYING'
        }
      }

      armAngleRef.current = nextAngle
      const lit = armStateRef.current === 'PLAYING' || armStateRef.current === 'SWEEPING'
      if (lit !== needleLitRef.current && needleLightRef.current) {
        needleLitRef.current = lit
        needleLightRef.current.style.opacity = lit ? '1' : '0'
      }
      armScaleRef.current = nextScale

      const scaleStr = physicalFeedback ? nextScale : 1.0
      // While tracking a groove the arm moves a fraction of a degree a second. Writing the
      // transform every frame repainted the whole arm 60 times a second for no visible
      // change, so only write when it has moved by a visible amount.
      const transform = `rotate(${nextAngle.toFixed(2)}deg) scale(${scaleStr.toFixed(4)})`
      if (transform !== lastTransformRef.current) {
        lastTransformRef.current = transform
        tonearmRef.current.style.transition = 'none'
        tonearmRef.current.style.transform = transform
      }
      
      const isResting = armStateRef.current === 'RESTING'
      const isRestPosition = nextAngle === REST_ANGLE && nextScale === 1.015
      if (isResting && isRestPosition && !isDragging && !isPlayingActive) {
        rafId = 0
        return
      }

      // Tracking a groove the arm moves well under a degree a minute, so between checks it
      // sleeps instead of waking the page on every display frame. Any change of state (pause,
      // power, seek) wakes it at once through the store subscription below.
      if (armStateRef.current === 'PLAYING') {
        rafId = -1
        sleepTimer = window.setTimeout(() => {
          sleepTimer = 0
          rafId = requestAnimationFrame(updateRotation)
        }, 120)
        return
      }

      rafId = requestAnimationFrame(updateRotation)
    }

    let sleepTimer = 0
    const wake = (): void => {
      if (sleepTimer) {
        window.clearTimeout(sleepTimer)
        sleepTimer = 0
        rafId = requestAnimationFrame(updateRotation)
      }
    }

    rafId = requestAnimationFrame(updateRotation)

    // Listen for manual seeks (from external sources) to snap tonearm smoothly
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      const a = state.currentTrack
      const b = prevState.currentTrack
      if (a !== b && (a?.title !== b?.title || a?.artist !== b?.artist)) {
        holdUntilRef.current = performance.now() + 600
        wake()
        if (!rafId && !isDragging) rafId = requestAnimationFrame(updateRotation)
      }
      // A seek needs only a wake: the playing arm sees the new groove is far off and glides there.
      if (
        state.isPlaying !== prevState.isPlaying ||
        state.isPowered !== prevState.isPowered ||
        Math.abs(state.progress - prevState.progress) > 1.5
      ) {
        wake()
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

    // A record being turned over (or a new place on the side) moves the arm too.
    const unsubscribeSides = useSidesStore.subscribe((state, prev) => {
      if (state.flipping === prev.flipping && state.place === prev.place) return
      wake()
      if (!rafId && !isDragging) rafId = requestAnimationFrame(updateRotation)
    })

    return () => {
      if (rafId > 0) cancelAnimationFrame(rafId)
      window.clearTimeout(sleepTimer)
      unsubscribe()
      unsubscribeSides()
    }
  }, [isDragging])

  const dragContextRef = useRef<{ startMouseAngle: number; startArmAngle: number } | null>(null)
  const movedRef = useRef(false)

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
    // Start from where the arm is now. (It used to start from wherever it was last
    // dropped, so it jumped on pick-up and a plain click could stop the music.)
    dragAngleRef.current = armAngleRef.current
    movedRef.current = false
    setIsDragging(true)

    const mouseAngle = getMouseAngle(event.clientX, event.clientY) ?? 0
    dragContextRef.current = {
      startMouseAngle: mouseAngle,
      startArmAngle: armAngleRef.current
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isDragging || !tonearmRef.current || !dragContextRef.current) return
    const mouseAngle = getMouseAngle(event.clientX, event.clientY)
    if (mouseAngle === null) return
    
    let angleDelta = mouseAngle - dragContextRef.current.startMouseAngle
    while (angleDelta > 180) angleDelta -= 360
    while (angleDelta < -180) angleDelta += 360
    
    if (Math.abs(angleDelta) > 0.6 && !movedRef.current) {
      movedRef.current = true
      // Picking the arm up off the record lifts the stylus. (A click without a drag does not.)
      needleLift()
    }
    const newAngle = dragContextRef.current.startArmAngle + angleDelta
    const clampedAngle = Math.max(-2, Math.min(42, newAngle))
    dragAngleRef.current = clampedAngle
    
    tonearmRef.current.style.transition = 'none'
    tonearmRef.current.style.transform = `rotate(${clampedAngle}deg) scale(1.015)`
    lastTransformRef.current = ''
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isDragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragContextRef.current = null
    setIsDragging(false)

    // A click without a drag does nothing: the arm settles back where it was. Only a real pointer
    // release can play, pause or seek: the arm's own motion never reaches this handler.
    if (!movedRef.current || !event.isTrusted) return

    const angle = dragAngleRef.current
    const state = usePlayerStore.getState()
    const isExternal = !!state.currentTrack?.sourceAppId
    const toggleSource = (): void => {
      if (isExternal && window.electron?.mediaPlayPause) {
        window.__kissaMediaCommandCooldown?.()
        void window.electron.mediaPlayPause()
      }
    }

    if (angle < 9) {
      // Back on the rest: stop, and keep the place in the song.
      if (state.isPlaying) {
        state.pause()
        toggleSource()
      }
      return
    }

    // Dropped on the record: play from that groove (when the source allows seeking).
    const { outer, inner } = anglesRef.current
    const clamped = Math.max(outer, Math.min(inner, angle))
    const ratio = (clamped - outer) / (inner - outer)
    const activeDur =
      state.currentTrack?.duration && state.currentTrack.duration > 0 ? state.currentTrack.duration : 210
    state.seek(ratio * activeDur)

    if (!state.isPlaying) {
      state.play()
      toggleSource()
    }
  }

  return (
    <div
      className={cn('absolute z-30 pointer-events-none select-none onboarding-tonearm', className)}
      style={style}
    >
      <svg
        viewBox="0 0 160 420"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="base-gimbal-well" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2e2e32" />
            <stop offset="100%" stopColor="#141416" />
          </linearGradient>
          <linearGradient id="armboard-edge" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Aluminium, lit from the upper left. */}
          <linearGradient id="rest-clip-metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#55585d" />
            <stop offset="40%" stopColor="#d9dbde" />
            <stop offset="65%" stopColor="#a9acb1" />
            <stop offset="100%" stopColor="#5d6065" />
          </linearGradient>
        </defs>

        {/* Arm stand: a raised anodised armboard in two steps (board, then bearing housing), with
            a soft contact shadow on the plinth, so the arm clearly stands on something. */}
        <g data-tonearm-part="armboard">
          <circle cx="116" cy="40" r="32" fill="rgba(0,0,0,0.32)" />
          <circle cx="115" cy="36" r="30.5" fill="url(#base-gimbal-well)" />
          <circle cx="115" cy="36" r="30" fill="none" stroke="url(#armboard-edge)" strokeWidth="1.1" />
          <circle cx="115" cy="37.2" r="23" fill="rgba(0,0,0,0.35)" />
          <circle cx="115" cy="36" r="22.5" fill="#1a1a1d" />
          <circle cx="115" cy="36" r="22" fill="none" stroke="url(#armboard-edge)" strokeWidth="0.8" />
        </g>

        {/* Arm rest: a slim post with an aluminium cradle under the parked arm, where 5.0 had its
            rest clip. The arm lies in it when parked and lifts clear of it when it swings out. */}
        <g data-tonearm-part="rest">
          <ellipse cx="116.2" cy="227" rx="7.5" ry="3" fill="rgba(0,0,0,0.34)" />
          <rect x="110.5" y="208" width="9" height="18" rx="3" fill="url(#base-gimbal-well)" />
          <rect x="110.5" y="208" width="9" height="18" rx="3" fill="none" stroke="url(#armboard-edge)" strokeWidth="0.7" />
          <path d="M 108.6 209.5 Q 115 216.5 121.4 209.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.6" strokeLinecap="round" transform="translate(0 0.9)" />
          <path d="M 108.6 209.5 Q 115 216.5 121.4 209.5" fill="none" stroke="url(#rest-clip-metal)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Cue lever: a short aluminium tab mounted on the armboard's edge, part of the arm
            assembly. */}
        <g data-tonearm-part="cue">
          <circle cx="135" cy="55" r="3.6" fill="#1c1c1f" stroke="url(#armboard-edge)" strokeWidth="0.6" />
          <line x1="135" y1="55" x2="143.5" y2="60.5" stroke="rgba(0,0,0,0.35)" strokeWidth="3.2" strokeLinecap="round" transform="translate(0 1)" />
          <line x1="135" y1="55" x2="143.5" y2="60.5" stroke="url(#rest-clip-metal)" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </svg>

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
                <linearGradient id="tonearm-tube-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2f3134" />
                  <stop offset="25%" stopColor="#7d8085" />
                  <stop offset="45%" stopColor="#b9bcc0" />
                  <stop offset="65%" stopColor="#979a9f" />
                  <stop offset="85%" stopColor="#585b60" />
                  <stop offset="100%" stopColor="#242629" />
                </linearGradient>
                <linearGradient id="headshell-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b6e73" />
                  <stop offset="35%" stopColor="#b7babf" />
                  <stop offset="55%" stopColor="#d4d6da" />
                  <stop offset="80%" stopColor="#9a9da2" />
                  <stop offset="100%" stopColor="#5d6065" />
                </linearGradient>
                <radialGradient id="needle-pool" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" style={{ stopColor: NEEDLE_LIGHT_COLOUR }} stopOpacity="0.22" />
                  <stop offset="60%" style={{ stopColor: NEEDLE_LIGHT_COLOUR }} stopOpacity="0.06" />
                  <stop offset="100%" style={{ stopColor: NEEDLE_LIGHT_COLOUR }} stopOpacity="0" />
                </radialGradient>
                <linearGradient id="counterweight-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3a3c40" />
                  <stop offset="35%" stopColor="#7b7e83" />
                  <stop offset="55%" stopColor="#9a9da2" />
                  <stop offset="80%" stopColor="#64676c" />
                  <stop offset="100%" stopColor="#323438" />
                </linearGradient>
              </defs>

              {/* Counterweight: one plain aluminium cylinder with a fine seam. */}
              <rect x="112.5" y="10" width="5" height="16" rx="2" fill="url(#tonearm-tube-metal)" />
              <rect x="103" y="3.5" width="24" height="18" rx="5" fill="rgba(0,0,0,0.3)" transform="translate(0.8 1.6)" />
              <rect x="103" y="2" width="24" height="18" rx="5" fill="url(#counterweight-metal)" data-tonearm-part="counterweight" />
              <line x1="103.5" y1="14.5" x2="126.5" y2="14.5" stroke="rgba(0,0,0,0.28)" strokeWidth="0.6" />
              <line x1="107" y1="2.6" x2="123" y2="2.6" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeLinecap="round" />

              {/* Pivot: a dark bearing housing, an aluminium collar and cap. */}
              <circle cx="115" cy="37.5" r="20" fill="rgba(0,0,0,0.3)" />
              <circle cx="115" cy="36" r="19" fill="#1c1c1f" />
              <circle cx="115" cy="36" r="18.5" fill="none" stroke="url(#armboard-edge)" strokeWidth="0.9" />
              <circle cx="115" cy="36" r="11" fill="#141416" stroke="url(#tonearm-tube-metal)" strokeWidth="2" />
              <circle cx="115" cy="36" r="4.5" fill="url(#counterweight-metal)" />

              {/* The arm's shadow on the record: two soft, offset, low-alpha strokes, no filter. */}
              <g transform="translate(3 5)" aria-hidden="true">
                <path d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="12" strokeLinecap="round" />
                <path d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="6" strokeLinecap="round" />
              </g>

              {/* The arm tube: slim aluminium with one fine highlight. */}
              <path
                d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358"
                fill="none"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358"
                fill="none"
                stroke="url(#tonearm-tube-metal)"
                strokeWidth="5.6"
                strokeLinecap="round"
              />
              <path
                d="M 114 54 L 114 176 C 113 256 109 282 63.4 333"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.7"
                strokeLinecap="round"
              />

              <g transform={`rotate(${HEADSHELL_DEG} 46 360)`}>
                {/* Its shadow on the record, offset away from the light. */}
                <path d="M 38 354 L 54 354 L 51.5 381 L 52.5 393 L 35.5 393 L 35.5 381 Z" transform="translate(3 4.5)" fill="rgba(0,0,0,0.3)" aria-hidden="true" />
                {/* Headshell: a lighter satin aluminium plate with a crisp edge, so its outline
                    reads against the black record. */}
                <path
                  d="M 38 354 L 54 354 L 51.5 381 L 35.5 381 Z"
                  fill="url(#headshell-metal)"
                  stroke="rgba(255,255,255,0.32)"
                  strokeWidth="0.6"
                  data-tonearm-part="headshell"
                />
                <line x1="38.8" y1="354.7" x2="53.2" y2="354.7" stroke="rgba(255,255,255,0.75)" strokeWidth="0.6" />
                {/* Cartridge: a dark body with a lit edge and a fine seam. */}
                <rect
                  x="36"
                  y="377"
                  width="16"
                  height="16"
                  rx="2"
                  fill="#1d1e21"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="0.6"
                  data-tonearm-part="cartridge"
                />
                <line x1="37" y1="377.8" x2="51" y2="377.8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
                {/* A neutral seam: the needle light is the deck's one touch of the room's colour. */}
                <rect x="37.5" y="388.4" width="13" height="1.1" rx="0.55" fill="rgba(255,255,255,0.26)" />
                {/* Cantilever and tip: bright, so the needle point is easy to find. */}
                <line x1="44" y1="393" x2="44.4" y2="400.5" stroke="#f1f2f4" strokeWidth="1.1" strokeLinecap="round" data-tonearm-part="stylus" />
                <circle cx="44.45" cy="400.9" r="0.85" fill="#ffffff" />
                {NEEDLE_LIGHT && (
                  <g
                    ref={needleLightRef}
                    data-tonearm-part="needle-light"
                    aria-hidden="true"
                    // Opacity is set from the arm's state (see needleLightRef); it fades on and off.
                    style={{ opacity: 0, transition: 'opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  >
                    {/* The faint pool on the grooves under the stylus. */}
                    <ellipse cx="44.5" cy="402.5" rx="11" ry="6" fill="url(#needle-pool)" />
                    {/* The point of light itself, with no more than a few pixels of halo. */}
                    <circle cx="44.45" cy="400.9" r="2.4" style={{ fill: NEEDLE_LIGHT_COLOUR }} opacity="0.28" />
                    <circle cx="44.45" cy="400.9" r="1.05" style={{ fill: NEEDLE_LIGHT_COLOUR }} />
                  </g>
                )}
                {/* Finger lift: lighter metal so it reads. */}
                <path
                  d="M 52 360 C 58 358 63.5 362 65.5 367.5"
                  fill="none"
                  stroke="url(#headshell-metal)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </g>
            </svg>

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
              title={t('tonearm.title')}
              aria-label={t('tonearm.label')}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

TonearmAssembly.displayName = 'TonearmAssembly'
