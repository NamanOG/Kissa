import { forwardRef, useId } from 'react'
import styles from './Tonearm.module.css'

/** Arm angles, in degrees, exactly as the desktop app uses them. */
export const ARM_REST = 0
export const ARM_OUTER_GROOVE = 23
export const ARM_INNER_GROOVE = 39.5

/**
 * The Kissa tonearm - artwork taken from the desktop app
 * (apps/desktop/src/renderer/src/features/turntable/TonearmAssembly.tsx):
 * gimbal pivot, brass counterweight, tapered satin tube, headshell and
 * cartridge. The forwarded ref points at the rotating arm; rotate it about
 * its CSS transform-origin (the pivot) with the angles above.
 */
interface TonearmProps {
  className?: string
  /** Fixed arm angle in degrees, for static uses. Omit when driving the arm through the ref. */
  angle?: number
  /** Rendered inside the rotating arm, so it travels with the headshell (e.g. a drag handle). */
  children?: React.ReactNode
}

export const Tonearm = forwardRef<HTMLDivElement, TonearmProps>(function Tonearm({ className = '', angle, children }, ref) {
  // Gradient ids must be unique per instance; the arm can appear more than once on a page.
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`
  const url = (name: string) => `url(#${name}-${uid})`

  return (
    <div className={`${styles.tonearm} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 420" className={styles.svg}>
        <defs>
          <radialGradient id={id('arm-well')} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2c2420" />
            <stop offset="60%" stopColor="#171210" />
            <stop offset="100%" stopColor="#0a0807" />
          </radialGradient>
          <linearGradient id={id('arm-rest')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#483e38" />
            <stop offset="50%" stopColor="#2a221d" />
            <stop offset="100%" stopColor="#15100e" />
          </linearGradient>
        </defs>
        <circle cx="115" cy="36" r="28" fill={url('arm-well')} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <circle cx="115" cy="36" r="27" fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="2" />
        <rect x="111" y="210" width="8" height="24" rx="2" fill={url('arm-rest')} stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
        <path d="M 107 220 L 123 220 L 123 224 L 107 224 Z" fill="#120e0c" />
      </svg>

      <div
        ref={ref}
        className={styles.arm}
        style={angle === undefined ? undefined : { transform: `rotate(${angle}deg)` }}
      >
        <svg viewBox="0 0 160 420" className={styles.svg}>
          <defs>
            <linearGradient id={id('arm-tube')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#241d18" />
              <stop offset="10%" stopColor="#7a6c5f" />
              <stop offset="26%" stopColor="#ded6cb" />
              <stop offset="42%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#ffffff" />
              <stop offset="74%" stopColor="#c8beaf" />
              <stop offset="90%" stopColor="#685b4f" />
              <stop offset="100%" stopColor="#1a1411" />
            </linearGradient>
            <radialGradient id={id('arm-gimbal')} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#78685c" />
              <stop offset="45%" stopColor="#362c26" />
              <stop offset="85%" stopColor="#1c1613" />
              <stop offset="100%" stopColor="#0e0b09" />
            </radialGradient>
            <linearGradient id={id('arm-brass')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#543e2a" />
              <stop offset="25%" stopColor="#caa474" />
              <stop offset="48%" stopColor="#fff3db" />
              <stop offset="65%" stopColor="#d7a76c" />
              <stop offset="85%" stopColor="#9c7244" />
              <stop offset="100%" stopColor="#3d2a1a" />
            </linearGradient>
          </defs>

          <rect x="112.5" y="8" width="5" height="18" rx="2" fill={url('arm-tube')} />
          <rect x="104" y="6" width="22" height="14" rx="3.5" fill={url('arm-brass')} stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
          <line x1="104" y1="11" x2="126" y2="11" stroke="rgba(0,0,0,0.5)" strokeWidth="0.75" />
          <line x1="104" y1="15" x2="126" y2="15" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <line x1="126" y1="14" x2="134" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="134" y1="14" x2="134" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <rect x="132" y="18" width="4" height="7" rx="1.5" fill={url('arm-brass')} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />

          <circle cx="115" cy="36" r="22" fill="#140f0c" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
          <circle cx="115" cy="36" r="21" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="1" />
          <circle cx="115" cy="36" r="18" fill={url('arm-gimbal')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
          <circle cx="115" cy="36" r="11" fill="#1b1512" stroke={url('arm-tube')} strokeWidth="2.5" />
          <circle cx="115" cy="36" r="4.5" fill="#e8dfd5" stroke="#120e0b" strokeWidth="1.2" />

          <path d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358" fill="none" stroke="#120e0c" strokeWidth="8.5" strokeLinecap="round" />
          <path d="M 115 52 L 115 178 C 114 260 110 286 64 336 L 46 358" fill="none" stroke={url('arm-tube')} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 113.8 54 L 113.8 176 C 112.8 256 108.8 282 63 333" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.85" strokeLinecap="round" />
          <path d="M 116.5 54 L 116.5 176 C 115.5 256 111.5 282 66 333" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" strokeLinecap="round" />

          <g transform="rotate(22 46 360)">
            <path d="M 38 354 L 54 354 L 51 382 L 35 382 Z" fill="#261f1b" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
            <rect x="36" y="377" width="16" height="17" rx="1.5" fill="#181310" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
            <circle cx="39" cy="380" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
            <circle cx="49" cy="380" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
            <circle cx="39" cy="391" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
            <circle cx="49" cy="391" r="0.8" fill="#a5978a" stroke="#000" strokeWidth="0.3" />
            <rect x="36" y="388" width="16" height="3" rx="0.75" fill="#d7a76c" />
            <line x1="44" y1="394" x2="44.5" y2="402" stroke="#e5dfd6" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="44.5" cy="402.5" r="1.1" fill="#ffffff" />
            <path d="M 52 360 C 58 358 64 362 66 368" fill="none" stroke={url('arm-tube')} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </svg>
        {children}
      </div>
    </div>
  )
})
