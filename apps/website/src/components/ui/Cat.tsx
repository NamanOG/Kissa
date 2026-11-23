import styles from './Cat.module.css'

/** The house cat, asleep on whatever ledge it found. Its ear and tail answer a hover. */
export function Cat({ className = '' }: { className?: string }) {
  return (
    <svg className={`${styles.cat} ${className}`} viewBox="0 0 150 72" aria-hidden="true">
      <g className={styles.breath}>
        <path
          className={styles.tail}
          d="M22 62c-13 1-20-5-18-14 1-6 8-8 11-3-4 1-5 5-2 8 3 2 8 2 13 1z"
        />
        <path d="M18 64c-4-20 13-40 42-43 22-2 42 5 52 18 5 7 5 18 3 25H18z" />
        <g className={styles.head}>
          <path d="M92 66c-7-10-5-26 7-33l3-15 13 10c6-1 12-1 18 1l12-11 3 17c8 8 8 22-1 31z" />
          <path className={styles.eye} d="M112 49q5 4 10 0M133 49q5 4 10 0" />
        </g>
      </g>
    </svg>
  )
}

/** A paper lantern on a short cord, turning a little in the draught. */
export function Lantern() {
  return (
    <svg className={styles.lantern} viewBox="0 0 64 150" aria-hidden="true">
      <path d="M32 0v44" stroke="#3a1205" strokeWidth="2" />
      <rect x="20" y="42" width="24" height="7" rx="1.5" fill="#3a1205" />
      <ellipse cx="32" cy="82" rx="30" ry="35" fill="currentColor" />
      <path d="M32 47c-22 8-22 62 0 70M32 47c22 8 22 62 0 70M32 47v70M7 66h50M3 82h58M7 98h50" fill="none" stroke="#a8321a" strokeOpacity=".5" strokeWidth="1.3" />
      <rect x="20" y="115" width="24" height="7" rx="1.5" fill="#3a1205" />
      <path d="M26 122v22M32 122v27M38 122v22" stroke="#3a1205" strokeWidth="1.6" />
    </svg>
  )
}

/** A cup left on the table, still warm. */
export function Teacup() {
  return (
    <svg className={styles.teacup} viewBox="0 0 120 112" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path className={styles.steam} d="M42 40c-7-8 7-13 0-22s4-12 2-16" />
        <path className={styles.steam} d="M64 40c-7-8 7-13 0-22s4-12 2-16" />
      </g>
      <path d="M18 50h70c1 26-13 44-35 44S17 76 18 50z" fill="#a8321a" />
      <path d="M87 57c15-3 22 5 19 14-3 8-13 11-24 9" fill="none" stroke="#a8321a" strokeWidth="6" />
      <path d="M12 100h82" stroke="#2b1608" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
