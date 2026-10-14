import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useStudyStore } from '@renderer/stores/studyStore'
import { environmentInfo, type StudyScene } from './scenes'
import { isRunning, segmentElapsed } from './studySession'
import { setAmbience } from './ambience'

/**
 * The Study Room's surroundings: the chosen environment seen through a window, a desk
 * lamp that comes on when a sitting begins, and the room's darkness at the edges so the
 * desk reads clearly.
 *
 * The scene keeps time without a number: progress through the focus block drives it
 * (open sittings over 50 minutes), and each new segment resets it.
 */
export function StudyWindowScene(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<StudyScene | null>(null)
  const reduceMotion = useReducedMotion() ?? false
  const environment = useStudyStore((s) => s.prefs.environment)
  const ambience = useStudyStore((s) => s.prefs.ambience)
  const hasSession = useStudyStore((s) => s.active !== null)
  const lampOn = useStudyStore((s) => s.active !== null && !s.active.interruption)
  const segmentId = useStudyStore((s) => s.active?.segment.id)
  const info = environmentInfo(environment)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let scene: StudyScene
    try {
      scene = info.create(canvas, reduceMotion)
    } catch {
      return
    }
    sceneRef.current = scene
    const fit = (): void => scene.resize(canvas.clientWidth, canvas.clientHeight)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    const visibility = (): void => (document.hidden ? scene.stop() : scene.start())
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return (): void => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      scene.dispose()
      sceneRef.current = null
    }
  }, [info, reduceMotion])

  // A new segment (a break, or the next block) returns the scene to its start.
  useEffect(() => {
    if (segmentId !== undefined) sceneRef.current?.reset()
  }, [segmentId])

  useEffect(() => {
    const update = (): void => {
      const scene = sceneRef.current
      if (!scene) return
      const s = useStudyStore.getState().active
      let progress = 0
      if (s && s.segment.kind === 'focus') {
        const span = s.segment.plannedMs ?? 50 * 60_000
        progress = Math.min(1, segmentElapsed(s.segment, Date.now()) / span)
      }
      scene.setActive(Boolean(s && isRunning(s)))
      scene.setProgress(progress)
    }
    update()
    const id = window.setInterval(update, reduceMotion ? 30_000 : 4_000)
    return (): void => window.clearInterval(id)
  }, [info, reduceMotion, hasSession, segmentId])

  useEffect(() => {
    setAmbience(ambience ? environment : null)
  }, [ambience, environment])
  useEffect(() => () => setAmbience(null), [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.canvas
          key={environment}
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.2 }}
          className="absolute inset-0 h-full w-full"
        />
      </AnimatePresence>

      {/* The window frame: a mullion and a transom catching a little lamplight. */}
      <div
        className="absolute inset-y-0 w-[14px] min-[1200px]:w-[18px]"
        style={{
          left: '64%',
          background: 'linear-gradient(90deg, #0b0806 0%, #1b1410 45%, #0e0a08 100%)',
          boxShadow: '-1px 0 0 rgba(255, 190, 130, 0.07), 0 0 40px rgba(0, 0, 0, 0.6)'
        }}
      />
      <div
        className="absolute inset-x-0 h-[12px] min-[1200px]:h-[16px]"
        style={{
          top: '11%',
          background: 'linear-gradient(180deg, #0e0a08 0%, #1b1410 50%, #0b0806 100%)',
          boxShadow: '0 1px 0 rgba(255, 190, 130, 0.06), 0 0 40px rgba(0, 0, 0, 0.55)'
        }}
      />

      {/* The desk the turntable stands on, its front edge catching the lamp. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[22%]"
        style={{
          background: 'linear-gradient(180deg, #23180f 0%, #170f09 35%, #0b0705 100%)',
          boxShadow: `inset 0 1px 0 rgba(${info.lamp}, 0.18), 0 -18px 40px rgba(0, 0, 0, 0.45)`
        }}
      />      {/* The desk lamp: a warm pool on the left, behind the desk. */}
      <div
        className="absolute inset-0 transition-opacity duration-[1600ms] ease-out motion-reduce:transition-none"
        style={{
          opacity: lampOn ? 1 : 0.3,
          background: `radial-gradient(ellipse 55% 75% at 16% 60%, rgba(${info.lamp}, 0.30), rgba(${info.lamp}, 0.10) 45%, transparent 75%)`
        }}
      />
      {/* The room around the window, dark at the edges and behind the desk. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,6,5,0.82) 0%, rgba(8,6,5,0.45) 32%, rgba(8,6,5,0) 55%), radial-gradient(ellipse at 68% 45%, transparent 55%, rgba(5,4,3,0.6) 100%), linear-gradient(0deg, rgba(8,6,5,0.75) 0%, rgba(8,6,5,0) 22%)'
        }}
      />
    </div>
  )
}
