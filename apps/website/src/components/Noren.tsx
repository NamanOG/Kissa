import styles from './Noren.module.css'

const PANELS = 9

/** The curtain over a kissa doorway, hung between one room and the next. */
export function Noren({ from, to }: { from: string; to: string }) {
  return (
    <div className={styles.noren} style={{ backgroundColor: to }} aria-hidden="true">
      <div className={styles.rail} />
      <div className={styles.panels}>
        {Array.from({ length: PANELS }, (_, i) => (
          <span
            key={i}
            style={{ backgroundColor: from, '--drop': `${((i * 5) % 4) * 3}%`, animationDelay: `${-i * 0.73}s` } as React.CSSProperties}
          >
            {i === Math.floor(PANELS / 2) && <i lang="ja">喫茶</i>}
          </span>
        ))}
      </div>
    </div>
  )
}
