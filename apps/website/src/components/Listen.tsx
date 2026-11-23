import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Card, Frame } from './Room'
import { Vinyl } from './ui/Vinyl'
import { RevealHeading } from './ui/Reveal'
import chapter from './Chapter.module.css'
import styles from './Listen.module.css'

const VERSES = [
  'Sit with the record, watch it turn',
  'Let the kettle find its song',
  'Rain is writing on the window',
  'Stay a little, stay along',
  'When the needle finds the middle',
  'Turn it over, carry on'
]

const STEPS = [
  { name: 'Play music the way you already do.', text: 'Spotify, Apple Music, TIDAL or a local player. Nothing to import, nothing to sign in to.' },
  { name: 'Kissa listens to Windows.', text: 'It reads the system media session for the track, the artwork and the position.' },
  { name: 'The needle drops.', text: 'A platter with real inertia, a tonearm you can drag, and lyrics that keep time.' }
]

/** Lyrics that fill word by word, each word held for about as long as it takes to sing. */
function WordByWord({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const [line, setLine] = useState(0)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const timeline = useMemo(() => {
    let at = 0
    let index = 0
    const words = VERSES.map((verse, lineIndex) => {
      const row = verse.split(' ').map((text) => {
        const duration = 230 + text.length * 62
        const word = { text, lineIndex, index: index++, start: at, end: at + duration }
        at += duration + 34
        return word
      })
      at += 620
      return row
    })
    return { words, flat: words.flat(), length: at + 700 }
  }, [])

  useEffect(() => {
    if (reduced || !active) return
    let frame = 0
    let started = performance.now()
    let shown = -1
    const tick = (now: number) => {
      let t = now - started
      if (t > timeline.length) {
        started = now
        t = 0
      }
      let current = 0
      for (const word of timeline.flat) {
        const fill = Math.max(0, Math.min(1, (t - word.start) / (word.end - word.start)))
        const el = wordRefs.current[word.index]
        if (el && el.dataset.fill !== fill.toFixed(2)) {
          el.dataset.fill = fill.toFixed(2)
          el.style.setProperty('--fill', `${fill * 100}%`)
        }
        if (t >= word.start) current = word.lineIndex
      }
      if (current !== shown) {
        shown = current
        setLine(current)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, active, timeline])

  return (
    <div className={styles.sheet}>
      <div className={styles.disc} aria-hidden="true">
        <Vinyl spinning={active} />
      </div>
      <div className={styles.window}>
        <ol
          className={styles.lines}
          style={{ '--line': reduced ? 1 : line } as React.CSSProperties}
          aria-label="Example of lyrics synced word by word"
        >
          {timeline.words.map((row, i) => (
            <li key={i} data-near={Math.min(3, Math.abs(i - (reduced ? 1 : line)))}>
              {row.map((word) => (
                <span
                  key={word.index}
                  ref={(el) => {
                    wordRefs.current[word.index] = el
                  }}
                  className={styles.word}
                  style={reduced ? ({ '--fill': '100%' } as React.CSSProperties) : undefined}
                >
                  {word.text}{' '}
                </span>
              ))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export function ListenChapter({ active }: { active: boolean }) {
  return (
    <div className={chapter.layout}>
      <div className={chapter.part} data-part="card">
        <Card>
          <RevealHeading id="listen-heading" className={chapter.title} lines={['Nothing to set up.', '*Just press play.*']} />
          <ul className={styles.steps} role="list">
            {STEPS.map((step) => (
              <li key={step.name}>
                <h3>{step.name}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className={`${chapter.part} ${chapter.picture}`} data-part="frame">
        <Frame kind="lacquer" caption="Lyrics, word by word">
          <WordByWord active={active} />
        </Frame>
      </div>
    </div>
  )
}
