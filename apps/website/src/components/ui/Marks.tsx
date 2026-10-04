import styles from './Marks.module.css'

/**
 * Kissa's small set of marks, drawn for this site rather than borrowed from
 * a generic icon font: the 喫茶 seal, record-side markers, and an outbound
 * arrow shaped like a tonearm leaving its pivot.
 */

/** 喫茶 ("kissa") set in a thin square — the mark on the sleeve and the hero. */
export function Seal({ className = '' }: { className?: string }) {
  return (
    <span className={`${styles.seal} ${className}`} lang="ja" aria-label="Kissa">
      喫茶
    </span>
  )
}

/** A record side, as printed on a label: the letter inside a ring. */
export function SideMark({ side }: { side: 'A' | 'B' }) {
  return (
    <svg className={styles.side} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9.25" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      <text x="10" y="7.4" textAnchor="middle" className={styles.sideLetter}>
        {side}
      </text>
    </svg>
  )
}

/** Outbound link: a short arm swinging up and out from a pivot dot. */
export function ArrowOut() {
  return (
    <svg className={styles.arrow} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="2.2" cy="9.8" r="1.2" fill="currentColor" />
      <path d="M2.2 9.8 L9.6 2.4 M5 2.2 H9.8 V7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
