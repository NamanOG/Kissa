import type { ReactNode } from 'react'
import { roomArt } from '@reserve'
import { Ambient } from './Ambient'
import { SCENE_TONES, type SceneId } from '../data/scenes'
import styles from './Room.module.css'

/** One room of the evening: the whole painting on the wall, with the page hung inside it. */
export function Room({
  id,
  scene,
  labelledBy,
  fit = false,
  children
}: {
  id: string
  scene: SceneId
  labelledBy: string
  fit?: boolean
  children: ReactNode
}) {
  const art = roomArt[scene]
  const tone = SCENE_TONES[scene]
  return (
    <section
      id={id}
      className={styles.room}
      data-painted={art ? 'true' : undefined}
      data-fit={fit ? 'true' : undefined}
      style={{ '--floor': tone.floor } as React.CSSProperties}
      aria-labelledby={labelledBy}
    >
      {art && (
        <div className={styles.art} aria-hidden="true">
          <img src={art} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
          <Ambient kind={tone.ambient} />
        </div>
      )}
      <div className={styles.stage}>{children}</div>
    </section>
  )
}

/** A paper menu card, pinned to the wall. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.card} ${className}`}>
      <span className={styles.pin} aria-hidden="true" />
      {children}
    </div>
  )
}

/** A picture hung on a wire: moulding, gilt slip, paper mat and a little glass. */
export function Frame({
  children,
  kind = 'walnut',
  caption,
  className = ''
}: {
  children: ReactNode
  kind?: 'walnut' | 'gilt' | 'lacquer'
  caption?: ReactNode
  className?: string
}) {
  return (
    <figure className={`${styles.frame} ${className}`} data-kind={kind}>
      <span className={styles.wire} aria-hidden="true" />
      <div className={styles.moulding}>
        <div className={styles.mat}>
          <div className={styles.glass}>{children}</div>
        </div>
      </div>
      {caption && <figcaption className={styles.plate}>{caption}</figcaption>}
    </figure>
  )
}
