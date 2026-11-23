import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion, useScroll } from 'motion/react'
import { roomArt } from '@reserve'
import { Ambient } from './Ambient'
import { HeroChapter } from './Stage'
import { ListenChapter } from './Listen'
import { ModesChapter } from './Modes'
import { RoomsChapter } from './Rooms'
import { DeckChapter } from './YourDeck'
import { FocusChapter } from './StudyRoom'
import { SCENE_TONES, type SceneId } from '../data/scenes'
import { smoothScroll } from '../lib/useSmoothScroll'
import styles from './Story.module.css'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface Chapter {
  anchor?: string
  scene?: SceneId
  floor: string
  render: (active: boolean) => ReactNode
}

const CHAPTERS: Chapter[] = [
  { floor: '#4a2612', render: (active) => <HeroChapter active={active} /> },
  { anchor: 'listen', scene: 'listen', floor: SCENE_TONES.listen.floor, render: (active) => <ListenChapter active={active} /> },
  { anchor: 'modes', scene: 'modes', floor: SCENE_TONES.modes.floor, render: (active) => <ModesChapter active={active} /> },
  { anchor: 'rooms', scene: 'rooms', floor: SCENE_TONES.rooms.floor, render: (active) => <RoomsChapter active={active} /> },
  { anchor: 'your-deck', scene: 'deck', floor: SCENE_TONES.deck.floor, render: (active) => <DeckChapter active={active} /> },
  { anchor: 'study', scene: 'study', floor: SCENE_TONES.study.floor, render: (active) => <FocusChapter active={active} /> }
]

const COUNT = CHAPTERS.length
const PANELS = 9
const CURTAIN = 0.3

/* How each room hands over to the next, chosen from the two rooms it joins. */
type Passage = 'noren' | 'shoji' | 'train' | 'record' | 'dusk'
const PASSAGES: Record<number, Passage> = { 1: 'noren', 2: 'shoji', 3: 'train', 4: 'record', 5: 'dusk' }
const OVERLAYS: Exclude<Passage, 'noren'>[] = ['shoji', 'train', 'record', 'dusk']
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => {
  const t = clamp(v)
  return t * t * (3 - 2 * t)
}

/**
 * The evening as one scene. The window stays put while scroll walks through the rooms: a noren
 * falls, the room changes behind it, the cloth lifts and the next room's card and picture settle.
 * Every frame writes only transform and opacity, directly to the elements.
 */
export function Story() {
  const track = useRef<HTMLElement>(null)
  const scenes = useRef<(HTMLElement | null)[]>([])
  const panels = useRef<(HTMLSpanElement | null)[]>([])
  const norenRef = useRef<HTMLDivElement>(null)
  const overlays = useRef<Partial<Record<Passage, HTMLDivElement | null>>>({})
  const reduced = useReducedMotion()
  const [chapter, setChapter] = useState(0)
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] })

  useIsomorphicLayoutEffect(() => {
    if (reduced) return
    const parts = scenes.current.map((root) => ({
      root,
      art: root?.querySelector<HTMLElement>('[data-part="art"]') ?? null,
      card: root?.querySelector<HTMLElement>('[data-part="card"]') ?? null,
      frame: root?.querySelector<HTMLElement>('[data-part="frame"]') ?? null
    }))
    let current = -1
    let shown: Passage | null = null
    const middle = (PANELS - 1) / 2

    const apply = (progress: number) => {
      const x = clamp(progress) * COUNT
      const index = Math.min(COUNT - 1, Math.floor(x))

      if (index !== current) {
        parts.forEach((part, i) => {
          if (part.root) part.root.style.visibility = i === index ? 'visible' : 'hidden'
        })
        current = index
        setChapter(index)
      }

      const u = clamp(x - index)
      const enter = index === 0 ? 1 : smooth((u - 0.14) / 0.24)
      const leave = index === COUNT - 1 ? 0 : smooth((u - 0.68) / 0.2)
      const part = parts[index]
      if (part.art) part.art.style.transform = `translate3d(0, ${((0.5 - u) * 1.3).toFixed(3)}%, 0) scale(${(1.05 - u * 0.05).toFixed(4)})`
      if (part.card) {
        part.card.style.transform = `translate3d(0, ${((1 - enter) * 72 - leave * 44).toFixed(1)}px, 0) rotate(${((1 - enter) * -2.4).toFixed(2)}deg)`
        part.card.style.opacity = (enter * (1 - leave)).toFixed(3)
      }
      if (part.frame) {
        part.frame.style.transform = `translate3d(${((1 - enter) * 46).toFixed(1)}px, ${((1 - enter) * 92 - leave * 66).toFixed(1)}px, 0) rotate(${((1 - enter) * 2).toFixed(2)}deg) scale(${(0.95 + enter * 0.05 - leave * 0.025).toFixed(4)})`
        part.frame.style.opacity = (enter * (1 - leave)).toFixed(3)
      }

      const boundary = Math.max(1, Math.min(COUNT - 1, Math.round(x)))
      const offset = x - boundary
      const nearness = 1 - Math.abs(offset) / CURTAIN
      const passage = nearness > 0 ? PASSAGES[boundary] : null

      if (passage !== shown) {
        shown = passage
        if (norenRef.current) norenRef.current.style.visibility = passage === 'noren' ? 'visible' : 'hidden'
        OVERLAYS.forEach((name) => {
          const el = overlays.current[name]
          if (el) el.style.visibility = passage === name ? 'visible' : 'hidden'
        })
      }
      if (!passage) return

      const through = offset / CURTAIN
      const cover = smooth(nearness)
      const el = overlays.current[passage as Exclude<Passage, 'noren'>]

      if (passage === 'noren') {
        panels.current.forEach((panel, i) => {
          if (!panel) return
          const delay = (Math.abs(i - middle) / middle) * 0.42
          const drop = smooth((nearness - delay) / (1 - delay))
          panel.style.transform = `translate3d(0, ${((drop - 1) * 102).toFixed(2)}%, 0)`
        })
      } else if (passage === 'shoji' && el) {
        const [left, right] = Array.from(el.children) as HTMLElement[]
        left.style.transform = `translate3d(${((cover - 1) * 101).toFixed(2)}%, 0, 0)`
        right.style.transform = `translate3d(${((1 - cover) * 101).toFixed(2)}%, 0, 0)`
      } else if (passage === 'train' && el) {
        const carriage = el.firstElementChild as HTMLElement
        carriage.style.transform = `translate3d(${(100 - ((through + 1) / 2) * 320).toFixed(2)}vw, 0, 0)`
      } else if (passage === 'record' && el) {
        const disc = el.firstElementChild as HTMLElement
        disc.style.transform = `translate(-50%, -50%) rotate(${(through * 150).toFixed(1)}deg) scale(${cover.toFixed(4)})`
      } else if (passage === 'dusk' && el) {
        const sky = el.firstElementChild as HTMLElement
        sky.style.transform = `translate3d(0, ${(through * -100).toFixed(2)}%, 0)`
      }
    }

    apply(scrollYProgress.get())
    return scrollYProgress.on('change', apply)
  }, [reduced, scrollYProgress])

  /* Stop inside a transition and it finishes by itself, resting in the middle of the next room. */
  useEffect(() => {
    if (reduced) return
    let timer = 0
    let release = 0
    let last = scrollYProgress.get()
    let direction: 1 | -1 = 1
    let lastWheel = 0
    let held = false

    const onWheel = () => {
      lastWheel = performance.now()
    }
    const onDown = () => {
      held = true
    }
    const onUp = () => {
      held = false
    }

    const settle = () => {
      const lenis = smoothScroll.lenis
      const element = track.current
      if (!lenis || !element || held || smoothScroll.gliding || performance.now() - lastWheel > 2600) return
      const x = clamp(scrollYProgress.get()) * COUNT
      if (x <= 0 || x >= COUNT) return
      const boundary = Math.max(1, Math.min(COUNT - 1, Math.round(x)))
      if (Math.abs(x - boundary) >= CURTAIN) return
      const room = direction > 0 ? boundary + 0.5 : boundary - 0.5
      const target = element.offsetTop + (room / COUNT) * (element.offsetHeight - window.innerHeight)
      const finish = () => {
        window.clearTimeout(release)
        smoothScroll.gliding = 0
      }
      smoothScroll.gliding = direction
      release = window.setTimeout(finish, 1500)
      lenis.scrollTo(target, {
        duration: 1.3,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        onComplete: finish
      })
    }

    const stop = scrollYProgress.on('change', (value) => {
      if (value !== last && !smoothScroll.gliding) direction = value > last ? 1 : -1
      last = value
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, 170)
    })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      stop()
      window.clearTimeout(timer)
      window.clearTimeout(release)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [reduced, scrollYProgress])

  return (
    <section ref={track} data-story={COUNT} className={styles.track} style={{ '--chapters': COUNT } as React.CSSProperties} aria-label="Kissa, room by room">
      {CHAPTERS.map(
        (item, i) =>
          item.anchor && (
            <div
              key={item.anchor}
              id={item.anchor}
              data-nav
              className={styles.anchor}
              style={{ '--at': (i + 0.5) / COUNT, '--span': 1 / COUNT } as React.CSSProperties}
            />
          )
      )}

      <div className={styles.window}>
        {CHAPTERS.map((item, i) => {
          const art = item.scene ? roomArt[item.scene] : undefined
          const active = Boolean(reduced) || i === chapter
          return (
            <article
              key={i}
              ref={(el) => {
                scenes.current[i] = el
              }}
              className={styles.scene}
              style={{ background: item.floor }}
            >
              {art && item.scene && (
                <div className={styles.art} data-part="art" aria-hidden="true">
                  <img src={art} alt="" width={1536} height={1024} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
                  {active && <Ambient kind={SCENE_TONES[item.scene].ambient} />}
                </div>
              )}
              {item.render(active)}
            </article>
          )
        })}

        <div ref={norenRef} className={styles.curtain} aria-hidden="true">
          {Array.from({ length: PANELS }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                panels.current[i] = el
              }}
            >
              {i === Math.floor(PANELS / 2) && <i lang="ja">喫茶</i>}
            </span>
          ))}
        </div>

        <div
          ref={(el) => {
            overlays.current.shoji = el
          }}
          className={`${styles.passage} ${styles.shoji}`}
          aria-hidden="true"
        >
          <span />
          <span />
        </div>
        <div
          ref={(el) => {
            overlays.current.train = el
          }}
          className={`${styles.passage} ${styles.train}`}
          aria-hidden="true"
        >
          <span />
        </div>
        <div
          ref={(el) => {
            overlays.current.record = el
          }}
          className={`${styles.passage} ${styles.record}`}
          aria-hidden="true"
        >
          <span />
        </div>
        <div
          ref={(el) => {
            overlays.current.dusk = el
          }}
          className={`${styles.passage} ${styles.dusk}`}
          aria-hidden="true"
        >
          <span />
        </div>
      </div>
    </section>
  )
}
