import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Coffee, Pause, Play, Plus, Square, Trash2 } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { useStudyStore } from '@renderer/stores/studyStore'
import {
  breakMs,
  focusMs,
  formatClock,
  formatMinutes,
  isRunning,
  segmentElapsed,
  segmentRemaining,
  type Rating,
  type SessionRecord,
  type StudySession
} from './studySession'

/** Re-renders once a second while mounted; the time itself comes from the session's anchors. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return (): void => window.clearInterval(id)
  }, [active])
  return active ? now : Date.now()
}

const LABEL = 'font-kissa-chassis text-[10px] font-semibold uppercase tracking-[0.22em]'
const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-tone px-5 py-2.5 text-[12.5px] font-bold text-[var(--surface)] shadow-[0_2px_12px_var(--accent)] shadow-black/30 transition-[transform,opacity] active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone'
const QUIET_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-ink/[0.06] px-3.5 py-2 text-[12px] font-bold text-ink transition-colors hover:bg-ink/[0.12] active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone'

type LengthChoice = '25' | '50' | '90' | 'open'
type BreakChoice = '0' | '5' | '10'

/**
 * The Study Room: a desk beside the deck. The record keeps playing whatever the person
 * chose; the desk holds an intention, a quiet clock and the session controls. Lyrics stay
 * out of the way. Nothing here measures attention: time is counted, the rating is the
 * person's own.
 */
export function StudyRoomView(): React.JSX.Element {
  const active = useStudyStore((s) => s.active)
  const review = useStudyStore((s) => s.review)
  const reduceMotion = useReducedMotion()

  const stage = review ? 'review' : active ? 'session' : 'setup'

  return (
    <section
      aria-label="Study desk"
      className="flex w-full flex-col items-start select-none px-8 py-20 min-[1200px]:px-12"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {stage === 'setup' && <SetupDesk />}
          {stage === 'session' && active && <SessionDesk session={active} />}
          {stage === 'review' && review && <ReviewDesk session={review} />}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function SetupDesk(): React.JSX.Element {
  const prefs = useStudyStore((s) => s.prefs)
  const lastIntention = useStudyStore((s) => s.lastIntention)
  const start = useStudyStore((s) => s.start)
  const setPrefs = useStudyStore((s) => s.setPrefs)
  const history = useStudyStore((s) => s.history)
  const [intention, setIntention] = useState('')
  const [length, setLength] = useState<LengthChoice>(
    prefs.plan.focusMinutes === null ? 'open' : (String(prefs.plan.focusMinutes) as LengthChoice)
  )
  const [breaks, setBreaks] = useState<BreakChoice>(String(prefs.plan.breakMinutes) as BreakChoice)

  const begin = (): void => {
    start(intention, {
      focusMinutes: length === 'open' ? null : Number(length),
      breakMinutes: Number(breaks)
    })
  }

  return (
    <div>
      <span className={cn(LABEL, 'text-tone')}>Study Room</span>
      <h1 className="mt-2 font-kissa-editorial text-[clamp(1.5rem,2.4vw,2.6rem)] font-medium leading-[1.1] tracking-[-0.025em] text-ink text-balance">
        Settle in.
      </h1>
      <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-dim">
        Keep the record playing and give this sitting a purpose. Kissa keeps the time.
      </p>

      <form
        className="mt-8 flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          begin()
        }}
      >
        <label className="flex flex-col gap-2">
          <span className={cn(LABEL, 'text-dim')}>Intention · optional</span>
          <input
            type="text"
            value={intention}
            maxLength={140}
            onChange={(e) => setIntention(e.target.value)}
            placeholder={lastIntention ? `e.g. ${lastIntention}` : 'e.g. Read chapter 4'}
            className="w-full rounded-xl border border-ink/10 bg-ink/[0.04] px-3.5 py-2.5 text-[14px] text-ink placeholder:text-dim/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] outline-none transition-colors focus:border-tone/60 focus:bg-ink/[0.06] select-text"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className={cn(LABEL, 'text-dim')} id="study-length">Sitting</span>
          <SegmentedTabs<LengthChoice>
            kind="radio"
            size="sm"
            className="self-start"
            label="Session length"
            value={length}
            onChange={setLength}
            tabs={[
              { id: '25', label: '25 min' },
              { id: '50', label: '50 min' },
              { id: '90', label: '90 min' },
              { id: 'open', label: 'Open' }
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={cn(LABEL, 'text-dim')}>Breaks</span>
          <SegmentedTabs<BreakChoice>
            kind="radio"
            size="sm"
            className="self-start"
            label="Break length"
            value={breaks}
            onChange={setBreaks}
            tabs={[
              { id: '0', label: 'None' },
              { id: '5', label: '5 min' },
              { id: '10', label: '10 min' }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="submit" className={PRIMARY_BUTTON}>
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Begin
          </button>
          <label className="flex items-center gap-2.5 text-[12px] text-dim">
            <HardwareSwitch
              checked={prefs.chime}
              onChange={(chime) => setPrefs({ chime })}
              aria-label="Soft chime at the end of a block"
            />
            Soft chime
          </label>
        </div>
      </form>

      {history.length > 0 && <HistoryList records={history} />}
    </div>
  )
}

function SessionDesk({ session }: { session: StudySession }): React.JSX.Element {
  const now = useNow(true)
  const { pause, resume, extend, takeBreak, backToFocus, finish } = useStudyStore.getState()
  const running = isRunning(session)
  const { segment } = session
  const isBreak = segment.kind === 'break'
  const remaining = segmentRemaining(segment, now)
  const elapsed = segmentElapsed(segment, now)
  const progress = segment.plannedMs ? Math.min(1, elapsed / segment.plannedMs) : null
  const totalFocus = focusMs(session, now)

  const clock = remaining !== null ? formatClock(remaining) : formatClock(elapsed)
  const phase = session.interruption
    ? 'Paused while you were away'
    : segment.ended
      ? isBreak
        ? 'Break over'
        : 'Focus block done'
      : isBreak
        ? running
          ? 'Break'
          : 'Break · paused'
        : running
          ? 'Focus'
          : 'Focus · paused'

  return (
    <div>
      <span className={cn(LABEL, isBreak ? 'text-dim' : 'text-tone')}>{phase}</span>
      <h1
        className="mt-2 font-kissa-editorial text-[clamp(1.5rem,2.3vw,2.4rem)] font-normal italic leading-[1.15] tracking-[-0.01em] text-ink/90 line-clamp-3 text-balance"
        title={session.intention || undefined}
      >
        {session.intention || 'Open study'}
      </h1>

      <div className="mt-8">
        <p
          className={cn(
            'font-kissa-editorial text-[clamp(4.5rem,9vw,8rem)] font-light leading-[0.9] tracking-[-0.02em] tabular-nums lining-nums text-ink transition-opacity [text-shadow:0_2px_30px_rgba(0,0,0,0.45)]',
            !running && !segment.ended && 'opacity-60'
          )}
          aria-live="off"
        >
          {clock}
        </p>
        <span className="sr-only" role="status">
          {segment.ended ? phase : ''}
        </span>

        {/* A tape counter: a hairline that fills, with a small copper pointer. */}
        {progress !== null && (
          <div className="relative mt-5 h-px w-full max-w-[340px] bg-ink/15" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 bg-tone/70" style={{ width: `${progress * 100}%` }} />
            <div
              className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-full bg-tone"
              style={{ left: `calc(${progress * 100}% - 1px)` }}
            />
          </div>
        )}

        <p className="mt-4 font-mono text-[10.5px] tracking-wide text-dim tabular-nums">
          {formatMinutes(totalFocus)} focused
          {session.breaksTaken > 0 && ` · ${session.breaksTaken} ${session.breaksTaken === 1 ? 'break' : 'breaks'}`}
          {remaining !== null && !segment.ended && ` · ${formatClock(elapsed)} in`}
        </p>
      </div>

      {session.interruption ? (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-ink/[0.04] p-4">
          <p className="text-[13px] leading-relaxed text-ink/90">
            Kissa wasn&apos;t running for {formatMinutes(session.interruption.awayMs)} (the computer slept or Kissa
            was closed). That time isn&apos;t counted.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={PRIMARY_BUTTON} onClick={resume}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Resume
            </button>
            <button type="button" className={QUIET_BUTTON} onClick={finish}>
              <Square className="h-3 w-3" aria-hidden="true" /> Finish
            </button>
          </div>
        </div>
      ) : segment.ended ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {isBreak ? (
            <button type="button" className={PRIMARY_BUTTON} onClick={backToFocus} autoFocus>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Back to it
            </button>
          ) : session.plan.breakMinutes > 0 ? (
            <button type="button" className={PRIMARY_BUTTON} onClick={() => takeBreak()} autoFocus>
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" /> Take {session.plan.breakMinutes} min break
            </button>
          ) : (
            <button type="button" className={PRIMARY_BUTTON} onClick={backToFocus} autoFocus>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Another block
            </button>
          )}
          <button type="button" className={QUIET_BUTTON} onClick={extend}>
            <Plus className="h-3 w-3" aria-hidden="true" /> 10 min
          </button>
          <button type="button" className={QUIET_BUTTON} onClick={finish}>
            <Square className="h-3 w-3" aria-hidden="true" /> Finish
          </button>
        </div>
      ) : (
        // Controls step back while the session runs; hover or keyboard focus brings them forward.
        <div
          className={cn(
            'mt-8 flex flex-wrap gap-2 transition-opacity duration-500 focus-within:opacity-100 hover:opacity-100',
            running ? 'opacity-45' : 'opacity-100'
          )}
        >
          {running ? (
            <button type="button" className={QUIET_BUTTON} onClick={pause}>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
            </button>
          ) : (
            <button type="button" className={PRIMARY_BUTTON} onClick={resume}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Resume
            </button>
          )}
          {isBreak ? (
            <button type="button" className={QUIET_BUTTON} onClick={backToFocus}>
              <Play className="h-3 w-3" aria-hidden="true" /> End break
            </button>
          ) : (
            <button type="button" className={QUIET_BUTTON} onClick={() => takeBreak(session.plan.breakMinutes || 5)}>
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" /> Break
            </button>
          )}
          {segment.plannedMs !== null && (
            <button type="button" className={QUIET_BUTTON} onClick={extend} aria-label="Add ten minutes">
              <Plus className="h-3 w-3" aria-hidden="true" /> 10 min
            </button>
          )}
          <button type="button" className={QUIET_BUTTON} onClick={finish}>
            <Square className="h-3 w-3" aria-hidden="true" /> Finish
          </button>
        </div>
      )}
    </div>
  )
}

const RATINGS: Array<{ id: Rating; label: string }> = [
  { id: 'distracted', label: 'Distracted' },
  { id: 'okay', label: 'Okay' },
  { id: 'focused', label: 'Focused' }
]

function ReviewDesk({ session }: { session: StudySession }): React.JSX.Element {
  const saveReview = useStudyStore((s) => s.saveReview)
  const discard = useStudyStore((s) => s.discard)
  const [rating, setRating] = useState<Rating | null>(null)
  const [done, setDone] = useState(false)
  const focus = focusMs(session, session.lastSeenAt)
  const rest = breakMs(session, session.lastSeenAt)
  const tooShort = focus < 60_000

  return (
    <div>
      <span className={cn(LABEL, 'text-tone')}>Session finished</span>
      <h1 className="mt-2 font-kissa-editorial text-[clamp(1.5rem,2.4vw,2.6rem)] font-medium leading-[1.1] tracking-[-0.025em] text-ink">
        {formatMinutes(focus)} of focus
      </h1>
      <p className="mt-3 font-mono text-[11px] tracking-wide text-dim tabular-nums">
        {session.breaksTaken > 0
          ? `${session.breaksTaken} ${session.breaksTaken === 1 ? 'break' : 'breaks'}, ${formatMinutes(rest)}`
          : 'No breaks'}
        {session.intention && ` · ${session.intention}`}
      </p>

      {session.intention && (
        <label className="mt-8 flex cursor-pointer items-center gap-3 text-[13.5px] text-ink">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => setDone(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-md border border-ink/20 bg-ink/[0.04] text-[var(--surface)] transition-colors peer-checked:border-tone peer-checked:bg-tone peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-tone"
          >
            {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          I did what I set out to do
        </label>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <span className={cn(LABEL, 'text-dim')}>How did it feel? · optional</span>
        <div role="radiogroup" aria-label="How the session felt" className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={rating === r.id}
              onClick={() => setRating(rating === r.id ? null : r.id)}
              className={cn(
                'rounded-xl border px-3.5 py-1.5 text-[12px] font-bold transition-colors cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
                rating === r.id
                  ? 'border-tone bg-tone/15 text-ink'
                  : 'border-ink/10 bg-ink/[0.04] text-dim hover:text-ink'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button type="button" className={PRIMARY_BUTTON} onClick={() => saveReview({ rating, intentionDone: done })}>
          {tooShort ? 'Close' : 'Save to my sessions'}
        </button>
        {!tooShort && (
          <button type="button" className={QUIET_BUTTON} onClick={discard}>
            Don&apos;t keep
          </button>
        )}
      </div>
      {tooShort && <p className="mt-3 text-[11.5px] text-dim">Sessions under a minute are not kept.</p>}
    </div>
  )
}

const RATING_LABEL: Record<Rating, string> = { distracted: 'Distracted', okay: 'Okay', focused: 'Focused' }

function HistoryList({ records }: { records: SessionRecord[] }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const deleteRecord = useStudyStore((s) => s.deleteRecord)
  const clearHistory = useStudyStore((s) => s.clearHistory)
  const [confirmClear, setConfirmClear] = useState(false)

  const weekFocus = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return records.filter((r) => r.startedAt >= since).reduce((sum, r) => sum + r.focusMs, 0)
  }, [records])

  const shown = expanded ? records : records.slice(0, 3)
  const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sessions: records }, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kissa-study-sessions-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <span className={cn(LABEL, 'text-dim')}>My sessions</span>
        <span className="font-mono text-[10.5px] text-dim tabular-nums">{formatMinutes(weekFocus)} this week</span>
      </div>
      <ul className="mt-3 divide-y divide-ink/[0.06] rounded-2xl border border-ink/[0.08] bg-ink/[0.03]">
        {shown.map((r) => (
          <li key={r.id} className="group flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">
                {r.intentionDone && <Check className="mr-1.5 inline h-3 w-3 text-tone" aria-label="Done" />}
                {r.intention || 'Open study'}
              </p>
              <p className="font-mono text-[10px] text-dim tabular-nums">
                {dateFmt.format(new Date(r.startedAt))} · {formatMinutes(r.focusMs)}
                {r.rating && ` · ${RATING_LABEL[r.rating]}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => deleteRecord(r.id)}
              className="rounded p-1 text-dim opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone group-hover:opacity-100"
              aria-label={`Delete session ${r.intention || 'Open study'}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
        {records.length > 3 && (
          <button type="button" className="hover:text-ink cursor-pointer" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show fewer' : `Show all ${records.length}`}
          </button>
        )}
        <button type="button" className="hover:text-ink cursor-pointer" onClick={exportJson}>
          Export
        </button>
        {confirmClear ? (
          <span className="flex items-center gap-3">
            <button
              type="button"
              className="text-red-300 hover:text-red-200 cursor-pointer"
              onClick={() => {
                clearHistory()
                setConfirmClear(false)
              }}
            >
              Clear all
            </button>
            <button type="button" className="hover:text-ink cursor-pointer" onClick={() => setConfirmClear(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="hover:text-ink cursor-pointer" onClick={() => setConfirmClear(true)}>
            Clear…
          </button>
        )}
      </div>
    </div>
  )
}
