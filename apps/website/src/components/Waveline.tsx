import { useEffect, useId, useRef } from 'react'
import {
  useAnimationFrame,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity
} from 'motion/react'
import styles from './Waveline.module.css'

const PHRASES = ['Albums, not algorithms', 'A quiet place for music', 'Made for the listening moment']
const TEXT = `${PHRASES.join('  ·  ')}  ·  `
const REPEATS = 6

/* Path geometry in SVG units; the path is long so text can travel along it. */
const WIDTH = 2400
const MID = 90
const CYCLES = 5
const MAX_AMPLITUDE = 46

function wavePath(amplitude: number, phase: number) {
  const pts: string[] = []
  for (let x = 0; x <= WIDTH; x += 24) {
    const y = MID + Math.sin((x / WIDTH) * Math.PI * 2 * CYCLES + phase) * amplitude
    pts.push(`${x} ${y.toFixed(2)}`)
  }
  return `M ${pts.join(' L ')}`
}

/**
 * Waveline - a line of type that is flat while the page is still and turns
 * into a travelling sound wave the faster you scroll, then settles again.
 *
 * Built on the idea of Fancy Components' Marquee Along SVG Path
 * (UI-Reference-System → fancy-components): text set on a path, with the
 * path itself driven by scroll velocity.
 */
export function Waveline() {
  const reduced = useReducedMotion()
  const id = useId()
  const pathRef = useRef<SVGPathElement>(null)
  const textRef = useRef<SVGTextPathElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const visible = useRef(false)

  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  // Scroll speed → wave height, on a soft spring so it swells and decays.
  const energy = useSpring(
    useTransform(velocity, (v) => Math.min(1, Math.abs(v) / 2200)),
    { stiffness: 90, damping: 18, mass: 0.5 }
  )

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => (visible.current = entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Length of one repeat of the phrase set, so the drift can loop seamlessly.
  const cycle = useRef(0)
  useEffect(() => {
    const measure = () => {
      cycle.current = (textRef.current?.getComputedTextLength() ?? 0) / REPEATS
    }
    measure()
    document.fonts?.ready.then(measure)
  }, [])

  const phase = useRef(0)
  const drift = useRef(0)
  useAnimationFrame((_, delta) => {
    if (reduced || !visible.current) return
    const e = energy.get()
    phase.current += delta * 0.0035 * (0.3 + e)
    drift.current += delta * 0.03 + Math.abs(velocity.get()) * delta * 0.00035
    if (cycle.current) drift.current %= cycle.current
    pathRef.current?.setAttribute('d', wavePath(e * MAX_AMPLITUDE, phase.current))
    textRef.current?.setAttribute('startOffset', String(-drift.current))
  })

  return (
    <div ref={sectionRef} className={styles.band} aria-hidden="true">
      <svg viewBox={`0 0 ${WIDTH} ${MID * 2}`} preserveAspectRatio="xMidYMid slice" className={styles.svg}>
        <path ref={pathRef} id={id} d={wavePath(0, 0)} fill="none" />
        <text className={styles.text} dominantBaseline="middle">
          <textPath ref={textRef} href={`#${id}`} startOffset="0">
            {TEXT.repeat(REPEATS)}
          </textPath>
        </text>
      </svg>
    </div>
  )
}
