import React, { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { useLanguageStore, useT, type Translate } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import type { TallyEntry } from '@renderer/features/session/tally'
import { listenTime, periodFor, type Recap } from './recap'
import { PressedCard } from './PressedCard'
import { formatTime } from './format'
import { CountUp, EASE_IN_OUT, EASE_OUT, Lift, Words, type CameraMove } from './storyKit'

/**
 * The scenes of Pressed. Each one is a short piece of choreography that plays once when it
 * opens and then holds still, so it can be read. The story moves on by itself.
 */

export type SceneId = 'open' | 'time' | 'crate' | 'artists' | 'songs' | 'when' | 'habits' | 'card' | 'empty'

/** How long each scene holds before the story moves on, in seconds. The card waits. */
export const SCENE_SECONDS: Record<SceneId, number> = {
  open: 8,
  time: 8,
  crate: 10,
  artists: 8,
  songs: 8,
  when: 8.5,
  habits: 8,
  card: 0,
  empty: 0
}

/**
 * How the camera moves in each scene. The opening pulls back from close on the record, the
 * number is pushed in on, the crate is tracked across, the artist's name trucks past, the
 * songs crane up, the day ring arrives with a slight roll, and the card settles still.
 */
export const SCENE_CAMERA: Partial<Record<SceneId, CameraMove>> = {
  open: { from: 'translate3d(-3%, 2%, 0) scale(1.22)', settle: 'translate3d(0, 0, 0) scale(1.015)', to: 'scale(1)' },
  time: { from: 'scale(0.9)', settle: 'scale(0.995)', to: 'scale(1.045)' },
  crate: { from: 'translate3d(4%, 0, 0) scale(1.05)', settle: 'translate3d(0.4%, 0, 0) scale(1.005)', to: 'translate3d(-0.6%, 0, 0) scale(1)' },
  artists: { from: 'translate3d(-5%, 0, 0) scale(1.07)', settle: 'translate3d(-0.6%, 0, 0) scale(1.01)', to: 'translate3d(1.2%, 0, 0) scale(1)' },
  songs: { from: 'translate3d(0, 6%, 0) scale(1.02)', settle: 'translate3d(0, 0.6%, 0)', to: 'translate3d(0, -1.4%, 0)' },
  when: { from: 'rotate(-5deg) scale(1.12)', settle: 'rotate(-0.4deg) scale(1.01)', to: 'rotate(0.6deg) scale(1.025)' },
  habits: { from: 'translate3d(0, -4%, 0) scale(1.06)', settle: 'translate3d(0, -0.4%, 0) scale(1.005)', to: 'translate3d(0, 0.8%, 0) scale(1.015)' },
  card: { from: 'translate3d(0, 3%, 0) scale(0.95)', settle: 'scale(1)', to: 'scale(1)' }
}

export function scenesFor(recap: Recap, enough: boolean): SceneId[] {
  if (!enough) return ['empty']
  const out: SceneId[] = ['open', 'time', 'crate']
  if (recap.artists.length) out.push('artists')
  if (recap.songs.length) out.push('songs')
  out.push('when')
  if (recap.days > 1) out.push('habits')
  out.push('card')
  return out
}

export type CoverLookup = (e: TallyEntry) => string | undefined

/** The record whose colours fill the room in a scene, so the light changes as the story goes. */
export function sceneCover(id: SceneId, recap: Recap, covers: CoverLookup): string | undefined {
  const byArtist = (artist?: string): string | undefined => {
    const hit = artist ? recap.albums.find((a) => (a.b ?? '').toLowerCase() === artist.toLowerCase()) : undefined
    return hit ? covers(hit) : undefined
  }
  const nth = (i: number): string | undefined => {
    const a = recap.albums[i] ?? recap.albums[0]
    return a ? covers(a) : undefined
  }
  switch (id) {
    case 'artists':
      return byArtist(recap.artists[0]?.a) ?? nth(1)
    case 'songs':
      return byArtist(recap.songs[0]?.b) ?? nth(2)
    case 'when':
      return nth(1)
    case 'habits':
      return nth(2)
    default:
      return nth(0)
  }
}

const SERIF = 'font-kissa-editorial font-medium tracking-[-0.035em] text-ink'
const KICKER = 'text-[13px] font-semibold text-tone'

interface SceneProps {
  recap: Recap
  covers: CoverLookup
  periodText: string
  reduce: boolean
}

export function PressedScene({ id, ...props }: SceneProps & { id: SceneId }): React.JSX.Element {
  switch (id) {
    case 'open':
      return <Open {...props} />
    case 'time':
      return <Time {...props} />
    case 'crate':
      return <Crate {...props} />
    case 'artists':
      return <Artists {...props} />
    case 'songs':
      return <Songs {...props} />
    case 'when':
      return <When {...props} />
    case 'habits':
      return <Habits {...props} />
    case 'card':
      return <CardScene {...props} />
    default:
      return <Empty reduce={props.reduce} />
  }
}

/* ---------------------------------------------------------------------------------------- */

/** A length of time as a number to count up to, and its unit. */
function timeParts(seconds: number, t: Translate): { value: number; decimals: number; unit: string } {
  if (seconds < 3600) {
    const m = Math.max(1, Math.round(seconds / 60))
    return { value: m, decimals: 0, unit: t(m === 1 ? 'pressed.unit.minute' : 'pressed.unit.minutes') }
  }
  const h = seconds / 3600
  const value = h < 10 ? Math.round(h * 10) / 10 : Math.round(h)
  return { value, decimals: value % 1 ? 1 : 0, unit: t(value === 1 ? 'pressed.unit.hour' : 'pressed.unit.hours') }
}

function plays(n: number, t: Translate): string {
  return `${n} ${t(n === 1 ? 'shelf.play.one' : 'shelf.play.other')}`
}

function roomName(id: string | null): string | null {
  if (!id) return null
  return LISTENING_ENVIRONMENTS.find((e) => e.id === id)?.name ?? null
}

export function useTitle(recap: Recap, periodText: string): string {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const p = recap.period
  if (p.kind === 'week') return p.current ? t('pressed.title.thisWeek') : t('pressed.title.week', { date: periodText })
  if (p.kind === 'month') {
    // In a sentence the month keeps the language's own case ("Your October", "Tu octubre").
    const start = new Date(p.start)
    const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(start)
    const year = start.getFullYear() === new Date().getFullYear() ? '' : ` ${start.getFullYear()}`
    return t('pressed.title.month', { month: month + year })
  }
  return t('pressed.title.year', { year: periodText })
}

/* ---------------------------------------------------------------------------------------- */

/** A record with the cover as its label. Spins up once, after `delay` ms, then rests. */
export function PressedRecord({
  cover,
  size,
  reduce,
  delay = 0
}: {
  cover?: string
  size: number | string
  reduce: boolean
  delay?: number
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduce || typeof el.animate !== 'function') return
    const a = el.animate([{ transform: 'rotate(-30deg)' }, { transform: 'rotate(690deg)' }], {
      duration: 5200,
      delay,
      easing: 'cubic-bezier(0.3, 0.2, 0.1, 1)',
      fill: 'both'
    })
    return () => a.cancel()
  }, [reduce, delay])
  return (
    <div
      ref={ref}
      className="relative shrink-0 rounded-full shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85),0_10px_20px_-8px_rgba(0,0,0,0.6)]"
      style={{
        width: size,
        height: size,
        background:
          'conic-gradient(from 30deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.08) 40deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,0.07) 220deg, rgba(255,255,255,0) 270deg), repeating-radial-gradient(circle at center, #121110 0 1.2px, #1a1817 1.2px 2.6px)'
      }}
    >
      <div className="absolute inset-[3%] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />
      <div className="absolute inset-[31%] overflow-hidden rounded-full bg-[#2a201a] shadow-[0_0_0_2px_rgba(0,0,0,0.55)]">
        {cover && <img src={cover} alt="" className="h-full w-full object-cover" draggable={false} />}
        <div className="absolute left-1/2 top-1/2 h-[7%] w-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b0806] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]" />
      </div>
    </div>
  )
}

function Cover({ src, className, style }: { src?: string; className?: string; style?: React.CSSProperties }): React.JSX.Element {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-[#2a201a]', className)} style={style}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,#151312_0_1px,#1d1a18_1px_3px)]" />
      )}
      {/* A little light across the sleeve, and its edge. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_38%,transparent_70%,rgba(0,0,0,0.18))]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" style={{ borderRadius: 'inherit' }} />
    </div>
  )
}

const SLEEVE_SHADOW = 'shadow-[0_50px_90px_-30px_rgba(0,0,0,0.95),0_18px_36px_-14px_rgba(0,0,0,0.7)]'

/* 1. The sleeve comes up, the record slides out and spins, and the title is set. ------------ */

function Open({ recap, covers, periodText, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const title = useTitle(recap, periodText)
  const cover = recap.albums[0] ? covers(recap.albums[0]) : undefined
  const facts = [
    formatTime(recap.seconds, t),
    t(recap.albumCount === 1 ? 'shelf.count.one' : 'shelf.count.other', { n: recap.albumCount }),
    t(recap.days === 1 ? 'pressed.days.one' : 'pressed.days.other', { n: recap.days })
  ]
  return (
    <div className="flex w-full flex-col items-center gap-12 min-[1000px]:flex-row min-[1000px]:justify-center min-[1000px]:gap-[6vw]">
      <div
        className="relative shrink-0"
        style={{ '--s': 'min(46vh, 30vw, 420px)', width: 'calc(var(--s) * 1.55)', height: 'var(--s)' } as React.CSSProperties}
      >
        <motion.div
          className="absolute left-[3%] top-[4%] aspect-square h-[92%]"
          initial={reduce ? false : { x: '0%' }}
          animate={{ x: '58%' }}
          transition={{ delay: 1.1, duration: 1.7, ease: EASE_IN_OUT }}
        >
          <PressedRecord cover={cover} size="100%" reduce={reduce} delay={1100} />
        </motion.div>
        <motion.div
          className="absolute left-0 top-0 aspect-square h-full"
          initial={reduce ? false : { y: '22%', opacity: 0, rotate: -4, scale: 0.94 }}
          animate={{ y: '0%', opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 1.3, ease: EASE_OUT }}
        >
          <Cover src={cover} className={cn('h-full w-full rounded-[5px]', SLEEVE_SHADOW)} />
        </motion.div>
      </div>
      <div className="max-w-[500px] text-center min-[1000px]:text-left">
        <Lift reduce={reduce} delay={1.5}>
          <p className={KICKER}>{recap.period.current ? t('pressed.soFar') : t('pressed.name')}</p>
        </Lift>
        <h2 className={cn(SERIF, 'mt-3 text-balance text-[clamp(2.6rem,5vw,4.4rem)] leading-[0.98]')}>
          <Words text={title} delay={1.7} reduce={reduce} />
        </h2>
        <Lift reduce={reduce} delay={2.7}>
          <p className="mt-5 text-[16px] leading-relaxed text-ink/70">{t('pressed.intro')}</p>
        </Lift>
        <Lift reduce={reduce} delay={3.2} className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] font-medium text-ink/85 min-[1000px]:justify-start">
          {facts.map((f, i) => (
            <React.Fragment key={f}>
              {i > 0 && <span className="h-1 w-1 rounded-full bg-ink/35" aria-hidden="true" />}
              <span>{f}</span>
            </React.Fragment>
          ))}
        </Lift>
      </div>
    </div>
  )
}

/* 2. The number runs up while the grooves are cut, one for each day with music. ------------- */

function Time({ recap, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const parts = timeParts(recap.seconds, t)
  let compare: string
  if (recap.prevSeconds === null || recap.prevSeconds === 0) compare = t('pressed.time.first')
  else {
    const prev = prevName(recap, lang, t)
    const diff = recap.seconds - recap.prevSeconds
    if (Math.abs(diff) < Math.max(600, recap.prevSeconds * 0.05)) compare = t('pressed.time.same', { prev })
    else compare = t(diff > 0 ? 'pressed.time.more' : 'pressed.time.less', { time: formatTime(Math.abs(diff), t), prev })
  }
  const daysText =
    recap.period.kind === 'year'
      ? t(recap.days === 1 ? 'pressed.time.daysOnly.one' : 'pressed.time.daysOnly.other', { n: recap.days })
      : t('pressed.time.days', { n: recap.days, total: recap.daysSoFar })
  return (
    <div className="relative flex w-full flex-col items-center justify-center text-center">
      <Grooves lit={recap.days} total={recap.daysSoFar} reduce={reduce} />
      <Lift reduce={reduce} delay={0.2} className="relative">
        <p className={KICKER}>{t('pressed.time.title')}</p>
      </Lift>
      <div className="relative mt-6 flex items-baseline justify-center gap-4">
        <CountUp
          value={parts.value}
          decimals={parts.decimals}
          lang={lang}
          delay={0.5}
          duration={2.6}
          reduce={reduce}
          className={cn(SERIF, 'text-[clamp(6rem,17vw,13.5rem)] leading-[0.9]')}
        />
        <Lift reduce={reduce} delay={1.4}>
          <span className="text-[clamp(1.2rem,2.2vw,1.8rem)] font-medium text-ink/75">{parts.unit}</span>
        </Lift>
      </div>
      <Lift reduce={reduce} delay={2.6} className="relative">
        <p className="mt-3 text-[16px] text-ink/75">{compare}</p>
      </Lift>
      <Lift reduce={reduce} delay={3.1} className="relative mt-10 w-full max-w-[600px]">
        <p className="mb-3 text-[12.5px] font-medium text-ink/60">{daysText}</p>
        <Waveform recap={recap} lang={lang} reduce={reduce} />
      </Lift>
    </div>
  )
}

function prevName(recap: Recap, lang: string, t: Translate): string {
  const p = periodFor(recap.period.kind, recap.period.start, -1)
  if (recap.period.kind === 'week') return t('pressed.prev.week')
  if (recap.period.kind === 'month') return new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(p.start))
  return String(new Date(p.start).getFullYear())
}

/** Faint grooves behind the number, cut from the centre out; the days with music catch the light. */
function Grooves({ lit, total, reduce }: { lit: number; total: number; reduce: boolean }): React.JSX.Element {
  const n = 26
  const on = Math.max(1, Math.round((Math.min(lit, total) / Math.max(1, total)) * n))
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[min(82vh,80vw)] w-[min(82vh,80vw)] -translate-x-1/2 -translate-y-1/2"
    >
      {Array.from({ length: n }, (_, i) => {
        // The days with music are spread through the grooves, not bunched at the edge.
        const lights = (i * on) % n < on
        return (
          <circle
            key={i}
            cx="100"
            cy="100"
            // Each groove starts its cut at a different angle, so the seams never line up.
            transform={`rotate(${-90 + i * 47} 100 100)`}
            r={34 + i * 2.5}
            fill="none"
            stroke={lights ? 'var(--accent)' : 'rgba(255,240,225,1)'}
            strokeWidth={lights ? 0.55 : 0.35}
            strokeOpacity={lights ? 0.42 : 0.07}
            // The cut is a CSS animation (main.css, pressed-cut): no script runs per frame for it.
            pathLength={1}
            strokeDasharray="1"
            style={reduce ? undefined : { animation: `pressed-cut 1.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.045}s both` }}
          />
        )
      })}
    </svg>
  )
}

/** The period as a waveform: one bar a day (a month for a year), rising in turn. */
function Waveform({ recap, lang, reduce }: { recap: Recap; lang: string; reduce: boolean }): React.JSX.Element {
  const start = new Date(recap.period.start)
  let bars: { key: string; s: number; future: boolean }[]
  let labels: string[]
  if (recap.period.kind === 'year') {
    const y = start.getFullYear()
    bars = Array.from({ length: 12 }, (_, m) => {
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
      let s = 0
      for (const [k, v] of Object.entries(recap.dayMap)) if (k.startsWith(prefix)) s += v
      return { key: prefix, s, future: new Date(y, m, 1).getTime() > Date.now() }
    })
    const fmt = new Intl.DateTimeFormat(lang, { month: 'narrow' })
    labels = bars.map((_, m) => fmt.format(new Date(y, m, 1)))
  } else {
    bars = []
    for (let d = new Date(start); d.getTime() < recap.period.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      bars.push({ key, s: recap.dayMap[key] ?? 0, future: d.getTime() > Date.now() })
    }
    if (recap.period.kind === 'week') {
      const fmt = new Intl.DateTimeFormat(lang, { weekday: 'narrow' })
      labels = bars.map((b) => fmt.format(new Date(`${b.key}T12:00:00`)))
    } else {
      labels = bars.map((_, i) => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : ''))
    }
  }
  const max = Math.max(1, ...bars.map((b) => b.s))
  const thin = bars.length > 12
  return (
    <div>
      <div className={cn('flex h-[86px] items-end', thin ? 'gap-[3px]' : 'gap-2')}>
        {bars.map((b, i) => (
          <div key={b.key} className={cn('kissa-well relative h-full flex-1 overflow-hidden', thin ? 'rounded-[3px]' : 'rounded-full', b.future && 'opacity-40')}>
            {b.s > 0 && (
              <motion.div
                className={cn('absolute inset-x-[2px] bottom-[2px] origin-bottom bg-tone', thin ? 'rounded-[2px]' : 'rounded-full')}
                style={{ height: `calc(${Math.max(8, (b.s / max) * 100)}% - 4px)` }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 3.3 + i * (thin ? 0.025 : 0.06) }}
              />
            )}
          </div>
        ))}
      </div>
      <div className={cn('mt-2 flex', thin ? 'gap-[3px]' : 'gap-2')} aria-hidden="true">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center text-[10.5px] tabular-nums text-ink/45">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/* 3. Flicking through the crate: the top five stand in a row of sleeves and fall forward one
      by one until the record of the period is left standing. ------------------------------ */

function Crate({ recap, covers, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const list = recap.albums.slice(0, 5)
  const n = list.length
  const [flipped, setFlipped] = useState(reduce ? Math.max(0, n - 1) : 0)
  const [revealed, setRevealed] = useState(reduce)
  useEffect(() => {
    if (reduce) return
    const timers: number[] = []
    for (let k = 1; k < n; k++) timers.push(window.setTimeout(() => setFlipped(k), 800 + (k - 1) * 480))
    timers.push(window.setTimeout(() => setRevealed(true), 800 + Math.max(0, n - 1) * 480 + 300))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [n, reduce])
  const top = list[0]
  const size = 'min(52vh, 34vw, 440px)'
  return (
    <LayoutGroup>
      <div className="flex w-full flex-col items-center gap-10 min-[1000px]:flex-row min-[1000px]:justify-center min-[1000px]:gap-[5vw]">
        {!revealed ? (
          <div className="relative" style={{ width: size, height: size, perspective: 1400 }}>
            {list
              .map((a, i) => ({ a, i }))
              .reverse()
              .map(({ a, i }) => {
                // The front sleeve is the last; `depth` counts how many still stand in front.
                const depth = n - 1 - i - flipped
                const gone = depth < 0
                return (
                  <motion.div
                    key={a.k}
                    layoutId={i === 0 ? 'pressed-hero' : undefined}
                    className="absolute inset-0"
                    style={{ zIndex: i + 1, transformOrigin: '50% 100%' }}
                    initial={reduce ? false : { y: 160, opacity: 0, rotateX: 0 }}
                    animate={
                      gone
                        ? { y: 70, opacity: 0, rotateX: -78, scale: 1 }
                        : { y: -depth * 46, opacity: 1, rotateX: 0, scale: 1 - depth * 0.05 }
                    }
                    transition={{
                      duration: gone ? 0.55 : 0.7,
                      ease: gone ? EASE_IN_OUT : EASE_OUT,
                      delay: flipped === 0 ? 0.05 + i * 0.07 : 0
                    }}
                  >
                    <Cover src={covers(a)} className={cn('h-full w-full rounded-[6px]', SLEEVE_SHADOW)} />
                    {/* Sleeves further back sit in the shade of the ones in front. */}
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-[6px] bg-black"
                      initial={false}
                      animate={{ opacity: gone ? 0 : Math.min(0.7, Math.max(0, depth) * 0.2) }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                    />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white/90">
                      {i + 1}
                    </span>
                  </motion.div>
                )
              })}
          </div>
        ) : (
          <motion.div layoutId="pressed-hero" className="relative shrink-0" style={{ width: size, height: size }} transition={{ duration: 1.1, ease: EASE_IN_OUT }}>
            <Cover src={top ? covers(top) : undefined} className={cn('h-full w-full rounded-[6px]', SLEEVE_SHADOW)} />
          </motion.div>
        )}
        {revealed && top && (
            <div className="max-w-[460px] text-center min-[1000px]:text-left">
              <Lift reduce={reduce} delay={0.3}>
                <p className={KICKER}>{t(`pressed.top.${recap.period.kind}`)}</p>
              </Lift>
              <h2 className={cn(SERIF, 'mt-3 line-clamp-3 text-balance text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1]')}>
                <Words text={top.a} delay={0.4} reduce={reduce} />
              </h2>
              <Lift reduce={reduce} delay={0.8}>
                <p className="mt-2 text-[18px] text-ink/75">{top.b}</p>
              </Lift>
              <Lift reduce={reduce} delay={1.0} className="mt-6 flex items-baseline justify-center gap-6 min-[1000px]:justify-start">
                <span className="flex items-baseline gap-2">
                  <CountUp value={top.p} lang={lang} delay={1.1} duration={1.4} reduce={reduce} className={cn(SERIF, 'text-[44px] leading-none')} />
                  <span className="text-[14px] text-ink/65">{t(top.p === 1 ? 'shelf.play.one' : 'shelf.play.other')}</span>
                </span>
                <span className="text-[14px] text-ink/65">{formatTime(top.s, t)}</span>
              </Lift>
              {list.length > 1 && (
                <div className="mt-9">
                  <Lift reduce={reduce} delay={1.5}>
                    <p className="text-[12.5px] font-medium text-ink/55">{t('pressed.runnersUp')}</p>
                  </Lift>
                  <div className="mt-3 flex justify-center gap-3 min-[1000px]:justify-start">
                    {list.slice(1).map((a, i) => (
                      <motion.div
                        key={a.k}
                        title={`${a.a}, ${a.b ?? ''}`}
                        initial={reduce ? false : { opacity: 0, x: 40, rotate: 6 }}
                        animate={{ opacity: 1, x: 0, rotate: 0 }}
                        transition={{ duration: 0.8, ease: EASE_OUT, delay: 1.6 + i * 0.1 }}
                        className="relative"
                      >
                        <Cover src={covers(a)} className="h-[64px] w-[64px] rounded-[4px] shadow-[0_14px_26px_-12px_rgba(0,0,0,0.9)]" />
                        <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#14100d] text-[10.5px] font-semibold tabular-nums text-ink/85 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                          {i + 2}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </LayoutGroup>
  )
}

/* 4. The top artist's name set very large, the rest coming up beneath. --------------------- */

function Artists({ recap, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const [top, ...rest] = recap.artists
  const parts = timeParts(top.s, t)
  return (
    <div className="w-full max-w-[1120px]">
      <Lift reduce={reduce} delay={0.15}>
        <p className={KICKER}>{t('pressed.artists.kicker')}</p>
      </Lift>
      <h2 className={cn(SERIF, 'mt-2 text-balance text-[clamp(3.4rem,9.5vw,8.6rem)] leading-[0.9]')}>
        <Words text={top.a} delay={0.35} stagger={0.08} duration={1.1} reduce={reduce} />
      </h2>
      <Lift reduce={reduce} delay={1.3} className="mt-5 flex items-baseline gap-5 text-ink/80">
        <span className="flex items-baseline gap-2">
          <CountUp value={parts.value} decimals={parts.decimals} lang={lang} delay={1.35} duration={1.6} reduce={reduce} className={cn(SERIF, 'text-[40px] leading-none')} />
          <span className="text-[15px]">{parts.unit}</span>
        </span>
        <span className="h-1 w-1 rounded-full bg-ink/35" aria-hidden="true" />
        <span className="text-[15px]">{plays(top.p, t)}</span>
      </Lift>
      {rest.length > 0 && (
        <ol className="mt-14 grid grid-cols-2 gap-x-10 gap-y-7 border-t border-white/[0.08] pt-7 min-[1000px]:grid-cols-4">
          {rest.map((e, i) => (
            <motion.li
              key={e.k}
              initial={reduce ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 2.0 + i * 0.14 }}
              className="min-w-0"
            >
              <span className="text-[13px] font-semibold tabular-nums text-tone">{i + 2}</span>
              <p className={cn(SERIF, 'mt-1 truncate text-[clamp(1.4rem,2.2vw,1.9rem)] leading-[1.1]')}>{e.a}</p>
              <p className="mt-1 text-[13px] text-ink/60">{formatTime(e.s, t)}</p>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* 5. Songs on repeat, each with a level that fills like a meter. -------------------------- */

function Songs({ recap, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const max = Math.max(1, ...recap.songs.map((s) => s.p))
  return (
    <div className="w-full max-w-[880px]">
      <h2 className={cn(SERIF, 'text-[clamp(2.8rem,6vw,5rem)] leading-[0.95]')}>
        <Words text={t('pressed.songs.title')} delay={0.15} reduce={reduce} />
      </h2>
      <ol className="mt-10">
        {recap.songs.map((s, i) => (
          <motion.li
            key={s.k}
            initial={reduce ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.7 + i * 0.16 }}
            className="grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(90px,220px)_4.5rem] items-center gap-4 border-b border-white/[0.07] py-4 last:border-b-0"
          >
            <span className={cn(SERIF, 'text-[26px] leading-none tabular-nums', i === 0 ? 'text-tone' : 'text-ink/45')}>{i + 1}</span>
            <span className="min-w-0">
              <span className={cn('block truncate font-semibold text-ink', i === 0 ? 'text-[19px]' : 'text-[16px]')}>{s.a}</span>
              <span className="block truncate text-[13.5px] text-ink/60">{s.b}</span>
            </span>
            <span className="kissa-well relative h-[10px] overflow-hidden rounded-full">
              <motion.span
                className="absolute inset-y-[2px] left-[2px] origin-left rounded-full bg-tone"
                style={{ width: `calc(${(s.p / max) * 100}% - 4px)` }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.3, ease: EASE_OUT, delay: 1.0 + i * 0.16 }}
              />
            </span>
            <span className="text-right text-[13px] text-ink/70">
              <CountUp value={s.p} lang={lang} delay={1.0 + i * 0.16} duration={1.3} reduce={reduce} className="font-semibold text-ink" />{' '}
              {t(s.p === 1 ? 'shelf.play.one' : 'shelf.play.other')}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

/* 6. The day as a record: each hour's groove is cut in turn round the clock, then the needle
      swings to the hour you play most. --------------------------------------------------- */

function hourLabel(h: number, lang: string): string {
  return new Intl.DateTimeFormat(lang, { hour: 'numeric' }).format(new Date(2026, 0, 1, h))
}

function When({ recap, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const max = Math.max(1, ...recap.hours)
  const S = 320
  const c = S / 2
  const r0 = 72
  const r1 = 152
  const mood = listenTime(recap.hours)
  const peakDeg = ((recap.peakHour + 0.5) / 24) * 360
  return (
    <div className="flex w-full flex-col items-center gap-12 min-[1000px]:flex-row min-[1000px]:justify-center min-[1000px]:gap-[7vw]">
      <motion.div
        initial={reduce ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
        className="relative shrink-0"
        style={{ width: 'min(58vh, 40vw, 460px)', aspectRatio: '1' }}
      >
        <div className="kissa-raised absolute inset-0 rounded-full" />
        <svg viewBox={`0 0 ${S} ${S}`} className="absolute inset-0 h-full w-full" role="img" aria-label={t(`pressed.when.${mood}`)}>
          <circle cx={c} cy={c} r={r1 + 4} fill="#100d0c" />
          {[0.3, 0.6, 0.9].map((f) => (
            <circle key={f} cx={c} cy={c} r={r0 + (r1 - r0) * f} fill="none" stroke="rgba(255,255,255,0.035)" />
          ))}
          {recap.hours.map((s, h) => {
            const a = ((h + 0.5) / 24) * Math.PI * 2 - Math.PI / 2
            const len = s > 0 ? 10 + (r1 - r0 - 18) * (s / max) : 2
            const x1 = c + (r0 + 6) * Math.cos(a)
            const y1 = c + (r0 + 6) * Math.sin(a)
            const x2 = c + (r0 + 6 + len) * Math.cos(a)
            const y2 = c + (r0 + 6 + len) * Math.sin(a)
            return (
              <motion.line
                key={h}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={s > 0 ? 'var(--accent)' : 'rgba(255,240,225,0.14)'}
                strokeWidth={s > 0 ? 11 : 6}
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: s > 0 ? 0.3 + 0.7 * (s / max) : 1 }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 + h * 0.05 }}
              />
            )
          })}
          <circle cx={c} cy={c} r={r0 - 4} fill="#1c1613" stroke="rgba(255,255,255,0.06)" />
          {[0, 6, 12, 18].map((h) => {
            const a = ((h / 24) * 360 - 90) * (Math.PI / 180)
            return (
              <text key={h} x={c + (r0 - 22) * Math.cos(a)} y={c + (r0 - 22) * Math.sin(a) + 3.5} textAnchor="middle" fontSize="10" fill="rgba(255,240,225,0.5)">
                {hourLabel(h, lang)}
              </text>
            )
          })}
        </svg>
        {/* The needle, swinging from midnight to the busiest hour. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={reduce ? false : { rotate: 0, opacity: 0 }}
          animate={{ rotate: peakDeg, opacity: 1 }}
          transition={{ rotate: { duration: 1.8, ease: EASE_IN_OUT, delay: 1.9 }, opacity: { duration: 0.4, delay: 1.7 } }}
        >
          <span className="absolute left-1/2 top-[3%] h-[44%] w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-ink to-ink/30" />
          <span className="absolute left-1/2 top-[3%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow-[0_0_14px_rgba(255,240,225,0.6)]" />
        </motion.div>
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b0806] shadow-[0_0_0_2px_rgba(255,255,255,0.08)]" />
      </motion.div>
      <div className="max-w-[420px] text-center min-[1000px]:text-left">
        <Lift reduce={reduce} delay={0.4}>
          <p className={KICKER}>{t('pressed.when.title')}</p>
        </Lift>
        <h2 className={cn(SERIF, 'mt-3 text-balance text-[clamp(2.4rem,4.6vw,4rem)] leading-[0.98]')}>
          <Words text={t(`pressed.when.${mood}`)} delay={0.6} reduce={reduce} />
        </h2>
        <Lift reduce={reduce} delay={3.6}>
          <p className="mt-5 text-[16px] text-ink/75">{t('pressed.when.peak', { hour: hourLabel(recap.peakHour, lang) })}</p>
        </Lift>
      </div>
    </div>
  )
}

/* 7. Habits: raised tiles that tip up into place, their numbers running up. ------------------ */

function Habits({ recap, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const room = roomName(recap.room)
  const tiles: { label: string; value?: number; unit?: string; text?: string }[] = [
    { label: t('pressed.streak'), value: recap.streak, unit: t(recap.streak === 1 ? 'pressed.unit.day' : 'pressed.unit.days') },
    { label: t('pressed.recordsPlayed'), value: recap.albumCount },
    { label: t('pressed.new'), value: recap.newRecords }
  ]
  if (room) tiles.push({ label: t('pressed.room'), text: room })
  return (
    <div className="w-full max-w-[1080px]">
      <h2 className={cn(SERIF, 'text-center text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[0.98]')}>
        <Words text={t('pressed.habits.title')} delay={0.15} reduce={reduce} />
      </h2>
      <div className={cn('mt-12 grid grid-cols-2 gap-5', tiles.length === 4 ? 'min-[1000px]:grid-cols-4' : 'min-[1000px]:grid-cols-3')} style={{ perspective: 1200 }}>
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={reduce ? false : { opacity: 0, y: 60, rotateX: -32 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.8 + i * 0.16 }}
            style={{ transformOrigin: '50% 100%' }}
            className="kissa-raised flex min-h-[210px] flex-col justify-between rounded-[28px] p-6"
          >
            <p className="text-[13px] font-medium text-ink/70">{tile.label}</p>
            {tile.value !== undefined ? (
              <p className="flex items-baseline gap-2">
                <CountUp value={tile.value} lang={lang} delay={1.2 + i * 0.16} duration={1.6} reduce={reduce} className={cn(SERIF, 'text-[clamp(3rem,5vw,4.4rem)] leading-none')} />
                {tile.unit && <span className="text-[15px] text-ink/70">{tile.unit}</span>}
              </p>
            ) : (
              <p className={cn(SERIF, 'text-balance text-[clamp(1.8rem,2.8vw,2.5rem)] leading-[1.02]')}>{tile.text}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* 8. The card comes up like a sleeve being handed over. ---------------------------------- */

function CardScene({ recap, covers, periodText, reduce }: SceneProps): React.JSX.Element {
  const t = useT()
  const title = useTitle(recap, periodText)
  return (
    <div className="flex w-full flex-col items-center gap-10 min-[1000px]:flex-row min-[1000px]:justify-center min-[1000px]:gap-16" style={{ perspective: 1600 }}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 120, rotateX: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.1 }}
        className="h-[min(64vh,580px)] shadow-[0_60px_100px_-40px_rgba(0,0,0,0.95)]"
        style={{ aspectRatio: '9 / 16', transformOrigin: '50% 100%' }}
      >
        <PressedCard recap={recap} covers={covers} title={title} scale="fit" />
      </motion.div>
      <div className="max-w-[360px] text-center min-[1000px]:text-left">
        <Lift reduce={reduce} delay={0.8}>
          <p className={KICKER}>{t('pressed.name')}</p>
        </Lift>
        <h2 className={cn(SERIF, 'mt-3 text-[clamp(2.2rem,3.8vw,3.2rem)] leading-[1]')}>
          <Words text={t('pressed.card.title')} delay={0.9} reduce={reduce} />
        </h2>
        <Lift reduce={reduce} delay={1.4}>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink/70">{t('pressed.card.text')}</p>
        </Lift>
        <Lift reduce={reduce} delay={1.7} className="mt-8 flex justify-center min-[1000px]:justify-start">
          <SaveCardButton recap={recap} covers={covers} title={title} />
        </Lift>
      </div>
    </div>
  )
}

function SaveCardButton({ recap, covers, title }: { recap: Recap; covers: CoverLookup; title: string }): React.JSX.Element {
  const t = useT()
  const [state, setState] = React.useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  const save = async (): Promise<void> => {
    setState('busy')
    const { savePressedCard } = await import('./saveCard')
    const ok = await savePressedCard(recap, covers, title)
    setState(ok ? 'done' : 'failed')
    window.setTimeout(() => setState('idle'), 2400)
  }
  return (
    <button
      type="button"
      onClick={() => void save()}
      disabled={state === 'busy'}
      className="h-12 cursor-pointer rounded-full bg-tone px-7 text-[15px] font-semibold text-[#160f0a] shadow-[0_14px_34px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent),inset_0_1px_0_rgba(255,255,255,0.35)] outline-none transition duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ink/60 active:scale-[0.98] disabled:opacity-70"
    >
      {state === 'done' ? t('pressed.saved') : state === 'failed' ? t('pressed.saveFailed') : t('pressed.save')}
    </button>
  )
}

function Empty({ reduce }: { reduce: boolean }): React.JSX.Element {
  const t = useT()
  return (
    <div className="max-w-[460px] text-center">
      <div className="mx-auto mb-8 w-fit">
        <PressedRecord size={140} reduce={reduce} />
      </div>
      <h2 className={cn(SERIF, 'text-[34px] leading-[1.05]')}>
        <Words text={t('pressed.empty.title')} delay={0.3} reduce={reduce} />
      </h2>
      <Lift reduce={reduce} delay={0.8}>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink/70">{t('pressed.empty.text')}</p>
      </Lift>
    </div>
  )
}
