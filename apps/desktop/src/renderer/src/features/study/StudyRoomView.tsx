import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Coffee, Pause, Play, Plus, Share2, Square, Trash2, X } from 'lucide-react'
import { SharePreviewModal } from '../share/SharePreviewModal'
import type { SharePayload } from '../../../../types/share'
import { cn } from '@renderer/utils/cn'
import { useStudyStore } from '@renderer/stores/studyStore'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { greetingFor } from '@renderer/utils/greeting'
import { useT, type MessageKey } from '@renderer/i18n'
import {
  breakMs,
  focusMs,
  formatClock,
  formatMinutes,
  goalStreak,
  isRunning,
  lastSevenDays,
  segmentElapsed,
  segmentRemaining,
  type Rating,
  type SessionRecord,
  type StudySession,
  type StudyTask
} from './studySession'

/**
 * The study journal: the open notebook on the desk. It holds the sitting's intention and
 * small steps, a soft clock, a place to park stray thoughts, and the day's progress.
 * Nothing here measures attention; time is counted and the rating is the person's own.
 *
 * Type and controls are Kissa's own: the editorial serif for the clock and intention,
 * chassis and mono labels, and the Listening Room's glass pills.
 */

/** Re-renders once a second; the time itself comes from the session's anchors. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return (): void => window.clearInterval(id)
  }, [active])
  return active ? now : Date.now()
}

const EYEBROW = 'font-sans text-[14px] font-semibold tracking-[-0.005em] text-tone'
const SOFT_LABEL = 'text-[12.5px] text-white/70'
// Kissa's immersive controls (the Listening Room's language): glass pills, quiet
// sentence-case sans labels, the room's accent for the one primary action.
const PRIMARY_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-tone px-5 font-sans text-[13.5px] font-semibold text-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone'
const QUIET_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 font-sans text-[13.5px] font-medium text-white/60 transition-[color,background-color,transform] hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone'
const CHIP = (selected: boolean): string =>
  cn(
    'h-8 rounded-full px-3.5 font-sans text-[13px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
    selected
      ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.14))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_8px_rgba(0,0,0,0.35)]'
      : 'text-white/70 hover:text-white'
  )

type LengthChoice = 25 | 50 | 90 | 0
type BreakChoice = 0 | 5 | 10

export function StudyRoomView(): React.JSX.Element {
  const tx = useT()
  const active = useStudyStore((s) => s.active)
  const review = useStudyStore((s) => s.review)
  const reduceMotion = useReducedMotion()
  const stage = review ? 'review' : active ? 'session' : 'setup'

  return (
    <section
      aria-label={tx('focus.journal')}
      className="flex h-full w-full flex-col select-none text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {stage === 'setup' && <SetupPage />}
          {stage === 'session' && active && <SessionPage session={active} />}
          {stage === 'review' && review && <ReviewPage session={review} />}
        </motion.div>
      </AnimatePresence>
      <TodayLine />
    </section>
  )
}

// ---- Setup ------------------------------------------------------------------

function SetupPage(): React.JSX.Element {
  const tx = useT()
  const prefs = useStudyStore((s) => s.prefs)
  const lastIntention = useStudyStore((s) => s.lastIntention)
  const start = useStudyStore((s) => s.start)
  const setPrefs = useStudyStore((s) => s.setPrefs)
  const history = useStudyStore((s) => s.history)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const [intention, setIntention] = useState('')
  const [length, setLength] = useState<LengthChoice>((prefs.plan.focusMinutes ?? 0) as LengthChoice)
  const [breaks, setBreaks] = useState<BreakChoice>(prefs.plan.breakMinutes as BreakChoice)
  const [steps, setSteps] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const begin = (): void => {
    start(intention, { focusMinutes: length === 0 ? null : length, breakMinutes: breaks }, steps)
  }

  if (showHistory) return <HistoryPage records={history} onBack={() => setShowHistory(false)} />

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pr-1 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]">
      <span className={EYEBROW}>{tx('focus.new')}</span>
      <h1 className="font-kissa-editorial mt-3 text-[clamp(2.3rem,min(4vw,7vh),3.6rem)] font-normal leading-[1.02] tracking-[-0.01em] text-balance">
        {greetingFor(new Date(), listenerName)}
      </h1>

      <form
        className="mt-10 flex flex-col gap-9 [@media(min-height:721px)_and_(max-height:800px)]:mt-6 [@media(min-height:721px)_and_(max-height:800px)]:gap-6 [@media(max-height:720px)]:mt-4 [@media(max-height:720px)]:gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          begin()
        }}
      >
        <label className="flex flex-col gap-3">
          <span className={SOFT_LABEL}>{tx('focus.working')}</span>
          <input
            type="text"
            value={intention}
            maxLength={140}
            onChange={(e) => setIntention(e.target.value)}
            placeholder={lastIntention ? lastIntention : tx('focus.example')}
            className="font-kissa-editorial w-full rounded-2xl border border-white/15 bg-black/35 px-5 py-3.5 text-[20px] text-white placeholder:text-white/45 outline-none transition-colors focus:border-white/30 select-text"
          />
        </label>

        <StepsEditor steps={steps} onChange={setSteps} />

        <div className="flex flex-wrap gap-x-10 gap-y-8">
          <div className="flex flex-col gap-3">
            <span className={SOFT_LABEL}>{tx('focus.length')}</span>
            <div role="radiogroup" aria-label={tx('focus.length')} className="inline-flex w-fit flex-wrap gap-0.5 rounded-full border border-white/10 bg-black/30 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {([25, 50, 90, 0] as LengthChoice[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={length === m}
                  className={CHIP(length === m)}
                  onClick={() => setLength(m)}
                >
                  {m === 0 ? tx('focus.open') : tx('focus.min', { m })}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className={SOFT_LABEL}>{tx('focus.breaks')}</span>
            <div role="radiogroup" aria-label={tx('focus.breakLength')} className="inline-flex w-fit flex-wrap gap-0.5 rounded-full border border-white/10 bg-black/30 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {([0, 5, 10] as BreakChoice[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={breaks === m}
                  className={CHIP(breaks === m)}
                  onClick={() => setBreaks(m)}
                >
                  {m === 0 ? tx('focus.none') : tx('focus.min', { m })}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="-mt-2 flex w-fit cursor-pointer items-center gap-3 font-sans text-[13px] text-white/80">
          <HardwareSwitch
            checked={prefs.keepScreenAwake}
            onChange={(keepScreenAwake) => setPrefs({ keepScreenAwake })}
            aria-label={tx('focus.keepAwakeLabel')}
          />
          {tx('focus.keepAwake')}
        </label>

        <div className="mt-1 flex items-center gap-5">
          <button type="submit" className={PRIMARY_BUTTON}>
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            {tx('focus.begin')}
          </button>
          {history.length > 0 && (
            <button
              type="button"
              className="font-sans text-[13px] font-semibold text-white/70 hover:text-white cursor-pointer"
              onClick={() => setShowHistory(true)}
            >
              {tx('focus.mySessions')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

/** Small steps for the sitting, written before starting. */
function StepsEditor({
  steps,
  onChange
}: {
  steps: string[]
  onChange: (s: string[]) => void
}): React.JSX.Element {
  const tx = useT()
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(steps.length > 0)
  const add = (): void => {
    if (!draft.trim() || steps.length >= 8) return
    onChange([...steps, draft.trim()])
    setDraft('')
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mt-3 inline-flex w-fit items-center gap-2 font-sans text-[13px] font-medium text-white/75 transition-colors hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone rounded"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {tx('focus.breakItDown')}
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <span className={SOFT_LABEL}>{tx('focus.smallSteps')}</span>
      {steps.length > 0 && (
        <ul className="flex flex-col gap-1">
          {steps.map((s, i) => (
            <li
              key={i}
              className="font-sans group flex items-center gap-2.5 text-[14px] text-white/85"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-tone/70" aria-hidden="true" />
              <span className="flex-1 truncate">{s}</span>
              <button
                type="button"
                aria-label={tx('focus.remove', { text: s })}
                className="text-white/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                onClick={() => onChange(steps.filter((_, j) => j !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {steps.length < 8 && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault()
                add()
              }
            }}
            placeholder={tx('focus.addStepHint')}
            aria-label={tx('focus.addStep')}
            className="font-sans flex-1 rounded-xl border border-dashed border-white/15 bg-transparent px-3 py-2 text-[14px] text-white/85 placeholder:text-white/30 outline-none focus:border-white/30 select-text"
          />
          <button
            type="button"
            onClick={add}
            aria-label={tx('focus.addStepButton')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/60 hover:bg-white/[0.12] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Session ----------------------------------------------------------------

function SessionPage({ session }: { session: StudySession }): React.JSX.Element {
  const tx = useT()
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
    ? tx('focus.away')
    : segment.ended
      ? isBreak
        ? tx('focus.breakOver')
        : tx('focus.blockDone')
      : isBreak
        ? running
          ? tx('focus.onBreak')
          : tx('focus.breakPaused')
        : running
          ? tx('focus.focusing')
          : tx('focus.paused')

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pr-1 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]">
      <span className={EYEBROW}>{phase}</span>
      <h1
        className="font-kissa-editorial mt-2 line-clamp-2 text-[clamp(1.4rem,2.1vw,1.9rem)] font-normal leading-[1.15] text-white/90 text-balance"
        title={session.intention || undefined}
      >
        {session.intention || tx('focus.openSession')}
      </h1>

      <p
        className={cn(
          'font-kissa-editorial mt-3 text-[clamp(4.5rem,min(10vw,17vh),9.5rem)] font-light leading-none tracking-[-0.01em] tabular-nums lining-nums text-white transition-opacity duration-500 [text-shadow:0_4px_40px_rgba(0,0,0,0.45)]',
          !running && !segment.ended ? 'opacity-55' : 'opacity-100'
        )}
      >
        {clock}
      </p>
      <span className="sr-only" role="status">
        {segment.ended || session.interruption ? phase : ''}
      </span>

      {progress !== null && (
        <div
          className="mt-4 h-[3px] w-full max-w-[300px] overflow-hidden rounded-full bg-white/10"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-tone/80 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="mt-2 flex items-center gap-3">
        <Rounds
          done={session.focusBlocksDone}
          current={!isBreak && !segment.ended}
          planned={session.plan.focusMinutes !== null}
        />
        <span className="font-sans text-[12.5px] text-white/45 tabular-nums">
          {tx('focus.focused', { time: formatMinutes(totalFocus) })}
          {session.breaksTaken > 0 &&
            ` · ${tx(session.breaksTaken === 1 ? 'focus.breakCount' : 'focus.breakCountMany', { n: session.breaksTaken })}`}
        </span>
      </div>

      {session.interruption ? (
        <div className="mt-7 max-w-[420px] rounded-2xl bg-black/40 p-5">
          <p className="font-sans text-[14px] leading-relaxed text-white/85">
            {tx('focus.notRunning', { time: formatMinutes(session.interruption.awayMs) })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={PRIMARY_BUTTON} onClick={resume}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {tx('focus.resume')}
            </button>
            <button type="button" className={QUIET_BUTTON} onClick={finish}>
              <Square className="h-3 w-3" aria-hidden="true" /> {tx('focus.finish')}
            </button>
          </div>
        </div>
      ) : segment.ended ? (
        <div className="mt-7 inline-flex w-fit self-start flex-wrap items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
          {isBreak ? (
            <button type="button" className={PRIMARY_BUTTON} onClick={backToFocus}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {tx('focus.backToIt')}
            </button>
          ) : session.plan.breakMinutes > 0 ? (
            <button type="button" className={PRIMARY_BUTTON} onClick={() => takeBreak()}>
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />{' '}
              {tx('focus.takeBreak', { m: session.plan.breakMinutes })}
            </button>
          ) : (
            <button type="button" className={PRIMARY_BUTTON} onClick={backToFocus}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {tx('focus.anotherBlock')}
            </button>
          )}
          <button type="button" className={QUIET_BUTTON} onClick={extend}>
            <Plus className="h-3 w-3" aria-hidden="true" /> {tx('focus.tenMin')}
          </button>
          <button type="button" className={QUIET_BUTTON} onClick={finish}>
            <Square className="h-3 w-3" aria-hidden="true" /> {tx('focus.finish')}
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'mt-7 inline-flex w-fit self-start flex-wrap items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.45)] backdrop-blur-3xl transition-opacity duration-500 focus-within:opacity-100 hover:opacity-100',
            running ? 'opacity-60' : 'opacity-100'
          )}
        >
          {running ? (
            <button type="button" className={QUIET_BUTTON} onClick={pause}>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" /> {tx('focus.pause')}
            </button>
          ) : (
            <button type="button" className={PRIMARY_BUTTON} onClick={resume}>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> {tx('focus.resume')}
            </button>
          )}
          {isBreak ? (
            <button type="button" className={QUIET_BUTTON} onClick={backToFocus}>
              <Play className="h-3 w-3" aria-hidden="true" /> {tx('focus.endBreak')}
            </button>
          ) : (
            <button
              type="button"
              className={QUIET_BUTTON}
              onClick={() => takeBreak(session.plan.breakMinutes || 5)}
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" /> {tx('focus.break')}
            </button>
          )}
          {segment.plannedMs !== null && (
            <button
              type="button"
              className={QUIET_BUTTON}
              onClick={extend}
              aria-label={tx('focus.addTen')}
            >
              <Plus className="h-3 w-3" aria-hidden="true" /> {tx('focus.tenMin')}
            </button>
          )}
          <button type="button" className={QUIET_BUTTON} onClick={finish}>
            <Square className="h-3 w-3" aria-hidden="true" /> {tx('focus.finish')}
          </button>
        </div>
      )}

      <div className="mt-8 max-w-[420px] border-t border-white/10 pt-5">
        <TaskList tasks={session.tasks ?? []} editable />
        <div className="mt-3 border-t border-white/[0.08] pt-3">
          <ThoughtJar session={session} />
        </div>
      </div>
    </div>
  )
}

/** One mark per focus block: filled when done, a ring for the one under way. */
function Rounds({
  done,
  current,
  planned
}: {
  done: number
  current: boolean
  planned: boolean
}): React.JSX.Element | null {
  const tx = useT()
  if (!planned) return null
  const marks = Array.from({ length: Math.min(8, done + (current ? 1 : 0)) })
  if (marks.length === 0) return null
  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={done === 1 ? tx('focus.blockDoneOne') : tx('focus.blocksDone', { n: done })}
    >
      {marks.map((_, i) => (
        <span
          key={i}
          className={cn('h-2 w-2 rounded-full', i < done ? 'bg-tone' : 'border border-tone/70')}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

function TaskList({
  tasks,
  editable
}: {
  tasks: StudyTask[]
  editable?: boolean
}): React.JSX.Element {
  const tx = useT()
  const toggleTask = useStudyStore((s) => s.toggleTask)
  const addTask = useStudyStore((s) => s.addTask)
  const removeTask = useStudyStore((s) => s.removeTask)
  const [draft, setDraft] = useState('')
  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={SOFT_LABEL}>{tx('focus.steps')}</span>
        {tasks.length > 0 && (
          <span className="font-sans text-[12px] text-white/45 tabular-nums">
            {tx('focus.ofTotal', { done: doneCount, total: tasks.length })}
          </span>
        )}
      </div>
      <ul className="mt-2 flex flex-col gap-0.5">
        {tasks.map((t) => (
          <li key={t.id} className="group flex items-center gap-2.5">
            <label className="font-sans flex flex-1 cursor-pointer items-center gap-3 rounded-lg py-1.5 text-[14.5px]">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white/30 transition-colors peer-checked:border-tone peer-checked:bg-tone peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-tone"
              >
                {t.done && <Check className="h-3 w-3 text-[var(--surface)]" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'flex-1 transition-colors',
                  t.done ? 'text-white/45 line-through decoration-white/30' : 'text-white/85'
                )}
              >
                {t.text}
              </span>
            </label>
            {editable && (
              <button
                type="button"
                aria-label={tx('focus.remove', { text: t.text })}
                onClick={() => removeTask(t.id)}
                className="text-white/45 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && tasks.length < 8 && (
        <input
          type="text"
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              addTask(draft)
              setDraft('')
            }
          }}
          placeholder={tasks.length ? tx('focus.addAnother') : tx('focus.addStepHint')}
          aria-label={tx('focus.addStep')}
          className="font-sans mt-1.5 w-full rounded-xl bg-transparent px-0 py-1.5 text-[14px] text-white/85 placeholder:text-white/30 outline-none select-text"
        />
      )}
    </div>
  )
}

/**
 * The thought jar: a stray to-do or idea goes in here instead of pulling you away. They
 * wait for you on the review page.
 */
function ThoughtJar({ session }: { session: StudySession }): React.JSX.Element {
  const tx = useT()
  const parkThought = useStudyStore((s) => s.parkThought)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const count = session.thoughts?.length ?? 0

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const park = (): void => {
    if (draft.trim()) parkThought(draft)
    setDraft('')
    setOpen(false)
  }

  return (
    <div>
      {open ? (
        <div className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={240}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') park()
              if (e.key === 'Escape') {
                e.stopPropagation()
                setOpen(false)
              }
            }}
            onBlur={() => !draft.trim() && setOpen(false)}
            placeholder={tx('focus.noteHint')}
            aria-label={tx('focus.note')}
            className="font-sans flex-1 bg-transparent text-[14px] text-white/85 placeholder:text-white/35 outline-none select-text"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-sans inline-flex items-center gap-2 rounded text-[13px] font-semibold text-white/45 transition-colors hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone"
          title={tx('focus.noteTitle')}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {tx('focus.note')}
          {count > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums">
              {count}
            </span>
          )}
        </button>
      )}
    </div>
  )
}

// ---- Review -----------------------------------------------------------------

const RATINGS: Array<{ id: Rating; label: MessageKey }> = [
  { id: 'distracted', label: 'focus.rate.distracted' },
  { id: 'okay', label: 'focus.rate.okay' },
  { id: 'focused', label: 'focus.rate.focused' }
]

function ReviewPage({ session }: { session: StudySession }): React.JSX.Element {
  const tx = useT()
  const saveReview = useStudyStore((s) => s.saveReview)
  const discard = useStudyStore((s) => s.discard)
  const removeThought = useStudyStore((s) => s.removeThought)
  const [rating, setRating] = useState<Rating | null>(null)
  const [done, setDone] = useState(false)
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null)
  const [finishSnapshot] = useState(() => {
    const track = usePlayerStore.getState().currentTrack
    return {
      room: useStudyStore.getState().prefs.environment,
      record:
        track && track.sourceAppId !== 'kissa-idle'
          ? { album: track.album || track.title, artist: track.artist }
          : undefined
    }
  })
  const focus = focusMs(session, session.lastSeenAt)
  const rest = breakMs(session, session.lastSeenAt)
  const tooShort = focus < 60_000
  const thoughts = session.thoughts ?? []

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pr-1 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]">
      <span className={EYEBROW}>{tx('focus.finished')}</span>
      <h1 className="font-kissa-editorial mt-2 text-[clamp(2rem,3vw,2.75rem)] font-normal leading-[1.05]">
        {tx('focus.ofFocus', { time: formatMinutes(focus) })}
      </h1>
      <p className="font-sans mt-2 text-[13px] text-white/45">
        {session.breaksTaken > 0
          ? tx('focus.breaksSummary', {
              breaks: tx(session.breaksTaken === 1 ? 'focus.breakCount' : 'focus.breakCountMany', {
                n: session.breaksTaken
              }),
              time: formatMinutes(rest)
            })
          : tx('focus.noBreaks')}
        {session.intention && ` · ${session.intention}`}
      </p>

      {session.intention && (
        <label className="font-sans mt-6 flex cursor-pointer items-center gap-3 text-[14.5px] text-white/85">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => setDone(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 transition-colors peer-checked:border-tone peer-checked:bg-tone peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-tone"
          >
            {done && <Check className="h-3 w-3 text-[var(--surface)]" strokeWidth={3} />}
          </span>
          {tx('focus.didIt')}
        </label>
      )}

      {(session.tasks?.length ?? 0) > 0 && (
        <div className="mt-5">
          <TaskList tasks={session.tasks ?? []} />
        </div>
      )}

      {thoughts.length > 0 && (
        <div className="mt-5">
          <span className={SOFT_LABEL}>{tx('focus.notes')}</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {thoughts.map((t) => (
              <li
                key={t.at}
                className="font-sans group flex items-start gap-2.5 rounded-xl bg-black/20 px-3 py-2 text-[14px] text-white/85"
              >
                <span className="flex-1 select-text">{t.text}</span>
                <button
                  type="button"
                  aria-label={tx('focus.dismissNote')}
                  onClick={() => removeThought(t.at)}
                  className="text-white/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <span className={SOFT_LABEL}>{tx('focus.howFelt')}</span>
        <div role="radiogroup" aria-label={tx('focus.howFeltLabel')} className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={rating === r.id}
              onClick={() => setRating(rating === r.id ? null : r.id)}
              className={CHIP(rating === r.id)}
            >
              {tx(r.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {!tooShort && (
          <button
            type="button"
            className={QUIET_BUTTON}
            onClick={() =>
              setSharePayload({
                type: 'study',
                aspectRatio: '4:5',
                data: {
                  ...finishSnapshot,
                  focusMinutes: Math.floor(focus / 60_000),
                  stepsDone: session.tasks?.filter((t) => t.done).length ?? 0,
                  stepsTotal: session.tasks?.length ?? 0
                }
              })
            }
          >
            <Share2 size={15} aria-hidden="true" />
            {tx('focus.share')}
          </button>
        )}
        <button
          type="button"
          className={PRIMARY_BUTTON}
          onClick={() => saveReview({ rating, intentionDone: done })}
        >
          {tooShort ? tx('focus.close') : tx('focus.save')}
        </button>
        {!tooShort && (
          <button type="button" className={QUIET_BUTTON} onClick={discard}>
            {tx('focus.dontKeep')}
          </button>
        )}
      </div>
      {tooShort && (
        <p className="font-sans mt-3 text-[12px] text-white/45">
          {tx('focus.tooShort')}
        </p>
      )}
      {sharePayload && (
        <SharePreviewModal payload={sharePayload} onClose={() => setSharePayload(null)} />
      )}
    </div>
  )
}

// ---- History and the day ------------------------------------------------------

const RATING_LABEL: Record<Rating, MessageKey> = {
  distracted: 'focus.rate.distracted',
  okay: 'focus.rate.okay',
  focused: 'focus.rate.focused'
}

function HistoryPage({
  records,
  onBack
}: {
  records: SessionRecord[]
  onBack: () => void
}): React.JSX.Element {
  const tx = useT()
  const deleteRecord = useStudyStore((s) => s.deleteRecord)
  const clearHistory = useStudyStore((s) => s.clearHistory)
  const [confirmClear, setConfirmClear] = useState(false)
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  const weekFocus = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return records.filter((r) => r.startedAt >= since).reduce((sum, r) => sum + r.focusMs, 0)
  }, [records])

  const exportJson = (): void => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), sessions: records }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kissa-focus-sessions-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="font-sans self-start text-[13px] font-semibold text-white/45 hover:text-white cursor-pointer"
      >
        {tx('focus.back')}
      </button>
      <h1 className="font-kissa-editorial mt-3 text-[clamp(1.8rem,2.6vw,2.4rem)] font-normal">
        {tx('focus.mySessions')}
      </h1>
      <p className="font-sans mt-1 text-[13px] text-white/45">
        {tx('focus.lastSeven', { time: formatMinutes(weekFocus) })}
      </p>
      <WeekStrip records={records} />
      <ul className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {records.map((r) => (
          <li
            key={r.id}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/20"
          >
            <div className="min-w-0 flex-1">
              <p className="font-kissa-editorial truncate text-[16px] text-white">
                {r.intentionDone && (
                  <Check className="mr-1.5 inline h-3.5 w-3.5 text-tone" aria-label={tx('focus.done')} />
                )}
                {r.intention || tx('focus.openSession')}
              </p>
              <p className="font-sans text-[12px] text-white/45 tabular-nums">
                {dateFmt.format(new Date(r.startedAt))} · {formatMinutes(r.focusMs)}
                {r.tasksTotal
                  ? ` · ${tx('focus.stepsCount', { done: r.tasksDone ?? 0, total: r.tasksTotal })}`
                  : ''}
                {r.rating && ` · ${tx(RATING_LABEL[r.rating])}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => deleteRecord(r.id)}
              className="text-white/45 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
              aria-label={tx('focus.delete', { name: r.intention || tx('focus.openSession') })}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="font-sans mt-3 flex items-center gap-4 text-[12.5px] font-semibold text-white/45">
        <button type="button" className="hover:text-white cursor-pointer" onClick={exportJson}>
          {tx('focus.export')}
        </button>
        {confirmClear ? (
          <>
            <button
              type="button"
              className="text-red-300 hover:text-red-200 cursor-pointer"
              onClick={() => {
                clearHistory()
                setConfirmClear(false)
                onBack()
              }}
            >
              {tx('focus.clearAll')}
            </button>
            <button
              type="button"
              className="hover:text-white cursor-pointer"
              onClick={() => setConfirmClear(false)}
            >
              {tx('focus.keep')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="hover:text-white cursor-pointer"
            onClick={() => setConfirmClear(true)}
          >
            {tx('focus.clear')}
          </button>
        )}
      </div>
    </div>
  )
}

/** A quiet week at a glance: one bar a day against the daily goal. */
function WeekStrip({ records }: { records: SessionRecord[] }): React.JSX.Element | null {
  const tx = useT()
  const goal = useStudyStore((s) => s.prefs.dailyGoalMinutes)
  const days = useMemo(() => lastSevenDays(records, Date.now()), [records])
  const goalMs = goal * 60_000
  const top = Math.max(goalMs, ...days.map((d) => d.focusMs), 60 * 60_000)
  const streak = goalStreak(days, goalMs)
  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
  const longFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
  const summary = days
    .map((d) => `${longFmt.format(new Date(d.start))} ${formatMinutes(d.focusMs)}`)
    .join(', ')

  return (
    <div className="mt-7" role="img" aria-label={tx('focus.byDay', { summary })}>
      <div className="relative flex h-16 items-end gap-2">
        {goalMs > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25"
            style={{ bottom: `${(goalMs / top) * 100}%` }}
            aria-hidden="true"
          >
            <span className="font-sans absolute -top-[17px] right-0 text-[10.5px] text-white/45">
              {tx('focus.goal', { time: formatMinutes(goalMs) })}
            </span>
          </div>
        )}
        {days.map((d, i) => {
          const met = goalMs > 0 && d.focusMs >= goalMs
          return (
            <div
              key={d.start}
              className="flex h-full flex-1 items-end"
              title={`${longFmt.format(new Date(d.start))}: ${formatMinutes(d.focusMs)}`}
            >
              <div
                className={cn(
                  'w-full rounded-[3px]',
                  met ? 'bg-white/90' : i === days.length - 1 ? 'bg-white/70' : 'bg-white/50'
                )}
                style={{
                  height: d.focusMs > 0 ? `${Math.max(4, (d.focusMs / top) * 100)}%` : '2px'
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-2" aria-hidden="true">
        {days.map((d, i) => (
          <span
            key={d.start}
            className={cn(
              'font-sans flex-1 text-center text-[11px]',
              i === days.length - 1 ? 'text-white/80' : 'text-white/40'
            )}
          >
            {dayFmt.format(new Date(d.start))}
          </span>
        ))}
      </div>
      {streak >= 2 && (
        <p className="font-sans mt-2 text-[12.5px] text-white/60">
          {tx('focus.streak', { n: streak })}
        </p>
      )}
    </div>
  )
}

/** The day's focus against an optional goal, at the foot of the journal. */
function TodayLine(): React.JSX.Element {
  const tx = useT()
  const history = useStudyStore((s) => s.history)
  const active = useStudyStore((s) => s.active)
  const goal = useStudyStore((s) => s.prefs.dailyGoalMinutes)
  const setPrefs = useStudyStore((s) => s.setPrefs)
  const now = useNow(active !== null)

  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const saved = history
    .filter((r) => r.startedAt >= midnight.getTime())
    .reduce((sum, r) => sum + r.focusMs, 0)
  const today =
    saved + (active && active.startedAt >= midnight.getTime() ? focusMs(active, now) : 0)
  const goalMs = goal * 60_000
  const share = goalMs > 0 ? Math.min(1, today / goalMs) : 0
  const goals = [60, 120, 180, 240]

  return (
    <div className="mt-5 shrink-0 border-t border-white/[0.08] pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-[12.5px] text-white/45">
          {tx('focus.today')}{' '}
          <span className="text-white/85 tabular-nums">
            {today < 60_000 ? tx('focus.nothingYet') : formatMinutes(today)}
          </span>
          {goal > 0 && <> {tx('focus.ofGoal', { time: formatMinutes(goalMs) })}</>}
        </span>
        <button
          type="button"
          className="font-sans text-[12px] font-semibold text-white/40 hover:text-white cursor-pointer"
          onClick={() =>
            setPrefs({ dailyGoalMinutes: goals[(goals.indexOf(goal) + 1) % goals.length] ?? 120 })
          }
          title={tx('focus.changeGoal')}
        >
          {tx('focus.goal', { time: formatMinutes(goalMs) })}
        </button>
      </div>
      {goal > 0 && (
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-white/50" style={{ width: `${share * 100}%` }} />
        </div>
      )}
    </div>
  )
}
