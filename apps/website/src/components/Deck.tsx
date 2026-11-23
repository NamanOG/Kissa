import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Tonearm, ARM_INNER_GROOVE, ARM_OUTER_GROOVE, ARM_REST } from './ui/Tonearm'
import { Vinyl } from './ui/Vinyl'
import { useInView } from '../lib/useInView'
import styles from './Deck.module.css'

export type DeckFinish = 'original' | 'walnut' | 'smoked' | 'oxblood'

/** The app's own finish palettes (features/editions/editions.ts). */
const FINISHES: Record<DeckFinish, { name: string; top: string[]; front: string[]; seam: string; plate: string; keyTop: string; keyBottom: string; radius: number; sheen: number }> = {
  original: { name: 'Original', top: ['#5a4a3f', '#3e3229', '#2a211c', '#1c1613', '#110d0b'], front: ['#46392f', '#312720', '#211a16', '#130f0c'], seam: 'rgba(255,245,225,.3)', plate: '#b0a08c', keyTop: '#2c2622', keyBottom: '#1c1815', radius: 18, sheen: 0.26 },
  walnut: { name: 'House walnut', top: ['#6a4a32', '#5a3e2a', '#4a3223', '#3a271b', '#2a1c13'], front: ['#4e3626', '#3a281c', '#2a1d14', '#1a120c'], seam: 'rgba(255,226,170,.45)', plate: '#e2c48a', keyTop: '#6e5428', keyBottom: '#3e2e14', radius: 16, sheen: 0.3 },
  smoked: { name: 'Smoked', top: ['#3a3d42', '#2f3236', '#26282c', '#1d1f22', '#141618'], front: ['#2a2c30', '#202226', '#17181b', '#0e0f11'], seam: 'rgba(255,255,255,.5)', plate: '#c5ccd4', keyTop: '#33363b', keyBottom: '#1a1c1f', radius: 10, sheen: 0.45 },
  oxblood: { name: 'Oxblood', top: ['#6b2420', '#5a1d1a', '#4a1715', '#3a1110', '#2a0b0a'], front: ['#4e1816', '#3b1211', '#2a0c0b', '#1a0706'], seam: 'rgba(255,210,190,.35)', plate: '#e8c48c', keyTop: '#6e5428', keyBottom: '#3e2e14', radius: 18, sheen: 0.38 }
}

const degreesPerMs = (rpm: number) => (rpm * 360) / 60000
const SIDE_MS = 240000
const PIVOT = { x: 0.71875, y: 0.08571 }

/**
 * Kissa's turntable, drawn from the app's plinth, record and tonearm. The keys work: Start spins
 * the platter up and cues the arm, 33 and 45 change speed, and the needle can be dragged.
 */
export function Deck({ finish = 'original', autoStart = true, active = true }: { finish?: DeckFinish; autoStart?: boolean; active?: boolean }) {
  const palette = FINISHES[finish]
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const [root, inView] = useInView<HTMLDivElement>()
  const spin = useRef<HTMLDivElement>(null)
  const arm = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [rpm, setRpm] = useState<33 | 45>(33)
  const motion = useRef({ angle: 0, speed: 0, arm: ARM_REST, position: 0.08, lastPlay: 0 })
  const grip = useRef<{ pointer: number; arm: number } | null>(null)
  const state = useRef({ running: false, rpm: 33 as 33 | 45 })
  state.current = { running, rpm }

  useEffect(() => {
    if (!autoStart) return
    if (reduced) {
      motion.current.arm = ARM_OUTER_GROOVE + (ARM_INNER_GROOVE - ARM_OUTER_GROOVE) * motion.current.position
      if (arm.current) arm.current.style.transform = `rotate(${motion.current.arm}deg)`
      return
    }
    const timer = window.setTimeout(() => setRunning(true), 850)
    return () => window.clearTimeout(timer)
  }, [autoStart, reduced])

  useEffect(() => {
    if (!inView || !active || reduced) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const m = motion.current
      const { running: on, rpm: speed } = state.current
      const target = on ? degreesPerMs(speed === 45 ? 45 : 100 / 3) : 0
      m.speed += (target - m.speed) * Math.min(1, (on ? 0.0024 : 0.0013) * dt)
      m.angle = (m.angle + m.speed * dt) % 360
      if (spin.current) spin.current.style.transform = `rotate(${m.angle}deg)`

      if (!grip.current) {
        if (on) {
          m.lastPlay = now
          m.position = (m.position + (dt / SIDE_MS) * (speed === 45 ? 1.35 : 1)) % 1
        }
        const groove = ARM_OUTER_GROOVE + (ARM_INNER_GROOVE - ARM_OUTER_GROOVE) * m.position
        const away = !on && now - m.lastPlay > 1800
        m.arm += ((away ? ARM_REST : groove) - m.arm) * Math.min(1, 0.0052 * dt)
      }
      if (arm.current) arm.current.style.transform = `rotate(${m.arm}deg)`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, active, reduced])

  const pointerAngle = useCallback((event: React.PointerEvent) => {
    const box = arm.current?.parentElement?.getBoundingClientRect()
    if (!box) return 0
    return (Math.atan2(event.clientY - (box.top + box.height * PIVOT.y), event.clientX - (box.left + box.width * PIVOT.x)) * 180) / Math.PI
  }, [])

  const onGrab = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    grip.current = { pointer: pointerAngle(event), arm: motion.current.arm }
  }
  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!grip.current) return
    let delta = pointerAngle(event) - grip.current.pointer
    while (delta > 180) delta -= 360
    while (delta < -180) delta += 360
    const next = Math.max(ARM_REST, Math.min(ARM_INNER_GROOVE, grip.current.arm + delta))
    motion.current.arm = next
    if (arm.current) arm.current.style.transform = `rotate(${next}deg)`
  }
  const onRelease = () => {
    if (!grip.current) return
    grip.current = null
    const m = motion.current
    if (m.arm >= ARM_OUTER_GROOVE - 5) {
      m.position = Math.max(0, Math.min(0.99, (m.arm - ARM_OUTER_GROOVE) / (ARM_INNER_GROOVE - ARM_OUTER_GROOVE)))
      m.lastPlay = performance.now()
      setRunning(true)
    } else {
      setRunning(false)
      m.lastPlay = 0
    }
  }

  const stops = (values: string[]) => values.map((color, i) => <stop key={i} offset={`${(i / (values.length - 1)) * 100}%`} stopColor={color} />)
  const r = palette.radius
  const front = `M 10 ${650 - r} Q 10 650 ${10 + r} 650 L ${990 - r} 650 Q 990 650 990 ${650 - r} L 990 670 Q 990 688 ${990 - r} 688 L ${10 + r} 688 Q 10 688 10 670 Z`

  return (
    <div
      ref={root}
      className={styles.deck}
      style={{ '--key-top': palette.keyTop, '--key-bottom': palette.keyBottom, '--plate': palette.plate } as React.CSSProperties}
    >
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.plinth}>
        <svg className={styles.base} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`t-${uid}`} x1="10%" y1="0%" x2="90%" y2="100%">{stops(palette.top)}</linearGradient>
            <linearGradient id={`f-${uid}`} x1="0" y1="0" x2="0" y2="1">{stops(palette.front)}</linearGradient>
            <radialGradient id={`s-${uid}`} cx="22%" cy="4%" r="85%">
              <stop offset="0%" stopColor="#fff1dc" stopOpacity={palette.sheen} />
              <stop offset="32%" stopColor="#fff1dc" stopOpacity={palette.sheen * 0.38} />
              <stop offset="66%" stopColor="#fff1dc" stopOpacity={palette.sheen * 0.06} />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`b-${uid}`} x1="0" y1="0" x2="1" y2="0.75">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.16" stopColor="#fff" stopOpacity={palette.sheen * 0.34} />
              <stop offset="0.3" stopColor="#fff" stopOpacity={palette.sheen * 0.1} />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`w-${uid}`} cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="#08080a" />
              <stop offset="80%" stopColor="#050506" />
              <stop offset="100%" stopColor="#151210" />
            </radialGradient>
          </defs>
          {[104, 836].map((x) => (
            <rect key={x} x={x} y="682" width="60" height="12" rx="3" fill="#0f0a08" />
          ))}
          <path d={front} fill={`url(#f-${uid})`} />
          <line x1={10 + r} y1="651" x2={990 - r} y2="651" stroke={palette.seam} strokeWidth="1.2" />
          <rect x="10" y="10" width="980" height="640" rx={r} fill={`url(#t-${uid})`} />
          <rect x="10" y="10" width="980" height="640" rx={r} fill={`url(#b-${uid})`} />
          <rect x="10" y="10" width="980" height="640" rx={r} fill={`url(#s-${uid})`} />
          <circle cx="420" cy="325" r="294" fill={`url(#w-${uid})`} />
          <rect x="10.5" y="10.5" width="979" height="639" rx={r} fill="none" stroke="rgba(255,255,255,.1)" />
          <line x1={10 + r} y1="11" x2={990 - r} y2="11" stroke={palette.seam} strokeWidth="1.2" />
          <line x1={10 + r} y1="649.6" x2={990 - r} y2="649.6" stroke="rgba(0,0,0,.6)" />
        </svg>

        <div className={styles.record}>
          <Vinyl ref={spin} platter />
          <Tonearm ref={arm} className={styles.tonearm}>
            <div
              className={styles.grip}
              onPointerDown={onGrab}
              onPointerMove={onDrag}
              onPointerUp={onRelease}
              onPointerCancel={onRelease}
              title="Drag the needle"
            />
          </Tonearm>
        </div>

        <span className={styles.power} data-on={running || undefined} aria-hidden="true"><i /></span>

        <div className={styles.keys} role="group" aria-label="Turntable controls">
          <div className={styles.speeds}>
            {([33, 45] as const).map((value) => (
              <button key={value} type="button" className={styles.key} aria-pressed={rpm === value} aria-label={`${value} RPM`} onClick={() => setRpm(value)}>
                <i />
                {value}
              </button>
            ))}
          </div>
          <button type="button" className={`${styles.key} ${styles.start}`} aria-pressed={running} onClick={() => setRunning((on) => !on)}>
            <i />
            {running ? 'Stop' : 'Start'}
          </button>
        </div>

        <span className={styles.nameplate} aria-hidden="true">Kissa <i /> {palette.name}</span>
      </div>
    </div>
  )
}
