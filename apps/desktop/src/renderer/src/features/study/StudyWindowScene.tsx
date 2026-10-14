import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useStudyStore } from '@renderer/stores/studyStore'
import { environmentInfo, type StudyScene } from './scenes'
import { isRunning, segmentElapsed } from './studySession'
import { setAmbience, setAmbienceVolume } from './ambience'

/**
 * The Study Room's surroundings: the chosen environment, full bleed, with a soft shade so
 * the room's type reads on top of it.
 *
 * The scene keeps time without a number: progress through the focus block drives it
 * (open sittings over 50 minutes), and each new segment resets it.
 */
export function StudyWindowScene({ className }: { className?: string }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<StudyScene | null>(null)
  const reduceMotion = useReducedMotion() ?? false
  const environment = useStudyStore((s) => s.prefs.environment)
  const ambience = useStudyStore((s) => s.prefs.ambience)
  const ambienceVolume = useStudyStore((s) => s.prefs.ambienceVolume)
  const hasSession = useStudyStore((s) => s.active !== null)
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
    scene.setPhoto(info.photo)
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
    setAmbienceVolume(ambienceVolume)
  }, [ambienceVolume])
  useEffect(() => {
    setAmbience(ambience ? environment : null)
  }, [ambience, environment])
  useEffect(() => () => setAmbience(null), [])

  return (
    <div aria-hidden="true" className={className}>
      <div className="absolute inset-0 overflow-hidden bg-black">
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
        {/* Shade on the left and at the edges, so the clock and controls read without a panel. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 36%, rgba(0,0,0,0.1) 58%, rgba(0,0,0,0.15) 100%), radial-gradient(ellipse at 60% 50%, transparent 50%, rgba(0,0,0,0.5) 100%), linear-gradient(0deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%)'
          }}
        />
      </div>
    </div>
  )
}