import { forwardRef } from 'react'
import styles from './Vinyl.module.css'
import { asset } from '../../lib/asset'

interface VinylProps {
  className?: string
  /** Label artwork; defaults to the app's own idle cover. */
  label?: string
  /** Spin continuously at 33⅓ with CSS (use the ref instead to drive rotation yourself). */
  spinning?: boolean
  /** Draw the machined platter under the record. */
  platter?: boolean
  /**
   * Draw stroboscope dots on the platter rim and expose them through this ref.
   * On a real deck they appear to stand still only at the correct speed; the
   * owner rotates this layer by the platter's speed error to recreate that.
   */
  strobeRef?: React.Ref<HTMLDivElement>
}

/**
 * The Kissa record, rendered the way the desktop app renders it
 * (apps/desktop/src/renderer/src/features/vinyl): a lacquer base, three
 * groove zones, catch-light rings, a pressed paper label and a steel
 * spindle. The reflection layer sits outside the rotating layer, because
 * light on a real record stays still while the grooves turn under it.
 *
 * The forwarded ref points at the rotating layer.
 */
export const Vinyl = forwardRef<HTMLDivElement, VinylProps>(function Vinyl(
  { className = '', label = asset('media/kissa-label.webp'), spinning = false, platter = false, strobeRef },
  ref
) {
  return (
    <div className={`${styles.vinyl} ${className}`} aria-hidden="true">
      {platter && <div className={`${styles.platter} ${strobeRef ? styles.platterWide : ''}`} />}
      {strobeRef && <div ref={strobeRef} className={styles.strobe} />}
      <div className={styles.contact} />

      <div ref={ref} className={`${styles.spin} ${spinning ? styles.spinning : ''}`}>
        <div className={styles.base} />
        <div className={styles.grooves} />
        <div className={styles.runout} />
        <div className={styles.leadin} />
        <svg className={styles.rings} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="22" strokeOpacity="0.04" strokeWidth="0.15" />
          <circle cx="50" cy="50" r="30" strokeOpacity="0.05" strokeWidth="0.15" />
          <circle cx="50" cy="50" r="38" strokeOpacity="0.06" strokeWidth="0.18" />
          <circle cx="50" cy="50" r="44" strokeOpacity="0.07" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="48" strokeOpacity="0.05" strokeWidth="0.15" />
        </svg>
        <div className={styles.edge} />
        <div className={styles.label}>
          <img src={label} alt="" width={512} height={512} draggable={false} />
        </div>
      </div>

      <div className={styles.reflection} />
      <div className={styles.reflectionCross} />
      <div className={styles.spindle} />
    </div>
  )
})
