/**
 * The Study Room's session clock, as plain data and pure functions.
 *
 * Time is never counted by a ticking interval. A segment (a focus block or a break)
 * stores when it last started running and how much it had run before that; displayed
 * time is derived from those anchors and the current wall clock. So switching views,
 * hiding to the tray, a throttled window or a restart cannot make the timer drift.
 *
 * What counts as study time:
 * - Focus time runs while a focus segment is running, whatever the music does.
 * - Pausing stops it. Breaks are counted separately.
 * - Locking Windows does not stop it (reading a paper book can let the screen lock).
 * - If Kissa stops observing time for more than STALL_MS (the PC slept, Kissa was
 *   closed or crashed, or the clock jumped), only time up to the last moment Kissa was
 *   running counts, and the person is asked to resume or finish. Hours of sleep never
 *   count as study.
 */

export type SegmentKind = 'focus' | 'break'

export type Rating = 'distracted' | 'okay' | 'focused'

export interface StudyTask {
  id: string
  text: string
  done: boolean
}

/** A stray thought set aside during a sitting, to deal with afterwards. */
export interface ParkedThought {
  at: number
  text: string
}

export interface SessionPlan {
  /** Minutes per focus block; null for an open session that counts up. */
  focusMinutes: number | null
  /** Minutes per break offered between focus blocks; 0 for no breaks. */
  breakMinutes: number
}

export interface Segment {
  /** Unique within the session, used so a completion cue fires once. */
  id: number
  kind: SegmentKind
  /** Planned length, or null when it simply counts up. */
  plannedMs: number | null
  /** Run time before runningSince. */
  elapsedBeforeMs: number
  /** When it last started or resumed; null while paused or ended. */
  runningSince: number | null
  ended: boolean
}

export interface StudySession {
  version: 1
  id: string
  intention: string
  plan: SessionPlan
  startedAt: number
  segment: Segment
  /** Focus and break time from segments that have ended. */
  focusMsDone: number
  breakMsDone: number
  breaksTaken: number
  focusBlocksDone: number
  /** The last moment Kissa saw the session (written on every tick). */
  lastSeenAt: number
  /** Set when time was not observed; the session waits for resume or finish. */
  interruption: { at: number; awayMs: number } | null
  /** The last segment whose end has been announced. */
  announcedSegmentId: number | null
  /** What this sitting is for, in small steps. Optional; older saved sessions have none. */
  tasks?: StudyTask[]
  thoughts?: ParkedThought[]
}

export interface SessionRecord {
  id: string
  intention: string
  startedAt: number
  endedAt: number
  focusMs: number
  breakMs: number
  breaks: number
  plannedFocusMinutes: number | null
  rating: Rating | null
  intentionDone: boolean
  tasksDone?: number
  tasksTotal?: number
  thoughts?: string[]
}

/** Longer than Kissa ever goes without a tick while running (ticks are 1 s, background unthrottled). */
export const STALL_MS = 2 * 60 * 1000
export const EXTEND_MS = 10 * 60 * 1000

export function segmentElapsed(segment: Segment, now: number): number {
  const running = segment.runningSince !== null ? Math.max(0, now - segment.runningSince) : 0
  const total = segment.elapsedBeforeMs + running
  return segment.plannedMs !== null ? Math.min(total, segment.plannedMs) : total
}

export function segmentRemaining(segment: Segment, now: number): number | null {
  if (segment.plannedMs === null) return null
  return Math.max(0, segment.plannedMs - segmentElapsed(segment, now))
}

export function isRunning(session: StudySession): boolean {
  return session.segment.runningSince !== null
}

/** Focus time so far, including the running segment. */
export function focusMs(session: StudySession, now: number): number {
  return session.focusMsDone + (session.segment.kind === 'focus' && !session.segment.ended ? segmentElapsed(session.segment, now) : 0)
}

export function breakMs(session: StudySession, now: number): number {
  return session.breakMsDone + (session.segment.kind === 'break' && !session.segment.ended ? segmentElapsed(session.segment, now) : 0)
}

function newSegment(id: number, kind: SegmentKind, plannedMs: number | null, now: number): Segment {
  return { id, kind, plannedMs, elapsedBeforeMs: 0, runningSince: now, ended: false }
}

export function startSession(
  intention: string,
  plan: SessionPlan,
  now: number,
  id: string,
  tasks: StudyTask[] = []
): StudySession {
  return {
    tasks: tasks.slice(0, 8),
    thoughts: [],
    version: 1,
    id,
    intention: intention.trim().slice(0, 140),
    plan,
    startedAt: now,
    segment: newSegment(1, 'focus', plan.focusMinutes ? plan.focusMinutes * 60_000 : null, now),
    focusMsDone: 0,
    breakMsDone: 0,
    breaksTaken: 0,
    focusBlocksDone: 0,
    lastSeenAt: now,
    interruption: null,
    announcedSegmentId: null
  }
}

function freeze(segment: Segment, at: number): Segment {
  if (segment.runningSince === null) return segment
  return { ...segment, elapsedBeforeMs: segmentElapsed(segment, at), runningSince: null }
}

/** Ends the current segment at `at`, moving its time into the totals. */
function closeSegment(session: StudySession, at: number): StudySession {
  if (session.segment.ended) return session
  const elapsed = segmentElapsed(session.segment, at)
  const segment = { ...freeze(session.segment, at), ended: true, elapsedBeforeMs: elapsed }
  return session.segment.kind === 'focus'
    ? {
        ...session,
        segment,
        focusMsDone: session.focusMsDone + elapsed,
        focusBlocksDone: session.focusBlocksDone + (session.segment.plannedMs !== null && elapsed >= session.segment.plannedMs ? 1 : 0)
      }
    : { ...session, segment, breakMsDone: session.breakMsDone + elapsed }
}

/**
 * Called on every tick and once when a saved session is loaded. Detects time Kissa did
 * not observe, and ends a planned segment that has run its length.
 */
export function advance(session: StudySession, now: number): StudySession {
  let next = session

  if (isRunning(next) && !next.interruption) {
    const gap = now - next.lastSeenAt
    if (gap > STALL_MS || gap < -5_000) {
      // Count only up to the last moment Kissa was watching, then wait for the person.
      const at = next.lastSeenAt
      next = { ...next, segment: freeze(next.segment, at), interruption: { at, awayMs: Math.max(0, now - at) } }
    }
  }

  const { segment } = next
  if (!segment.ended && segment.plannedMs !== null && segmentElapsed(segment, now) >= segment.plannedMs) {
    next = closeSegment(next, now)
  }

  return next.lastSeenAt === now ? next : { ...next, lastSeenAt: now }
}

export function pause(session: StudySession, now: number): StudySession {
  if (session.segment.ended || !isRunning(session)) return session
  return { ...session, segment: freeze(session.segment, now), lastSeenAt: now }
}

export function resume(session: StudySession, now: number): StudySession {
  if (session.segment.ended || isRunning(session)) return { ...session, interruption: null, lastSeenAt: now }
  return { ...session, segment: { ...session.segment, runningSince: now }, interruption: null, lastSeenAt: now }
}

/** Adds ten minutes to a planned segment, reopening it if it had just ended. */
export function extend(session: StudySession, now: number): StudySession {
  const { segment } = session
  if (segment.plannedMs === null) return session
  if (!segment.ended) {
    return { ...session, segment: { ...segment, plannedMs: segment.plannedMs + EXTEND_MS }, lastSeenAt: now }
  }
  // Reopen: take its time back out of the totals and carry on.
  const reopened: Segment = {
    ...segment,
    plannedMs: segment.plannedMs + EXTEND_MS,
    ended: false,
    runningSince: now
  }
  const wasCompleteBlock = segment.kind === 'focus' && segment.elapsedBeforeMs >= segment.plannedMs
  return segment.kind === 'focus'
    ? {
        ...session,
        segment: reopened,
        focusMsDone: session.focusMsDone - segment.elapsedBeforeMs,
        focusBlocksDone: session.focusBlocksDone - (wasCompleteBlock ? 1 : 0),
        lastSeenAt: now
      }
    : { ...session, segment: reopened, breakMsDone: session.breakMsDone - segment.elapsedBeforeMs, lastSeenAt: now }
}

export function startBreak(session: StudySession, now: number, minutes?: number): StudySession {
  const closed = closeSegment(session, now)
  const breakMinutes = minutes ?? session.plan.breakMinutes
  return {
    ...closed,
    segment: newSegment(closed.segment.id + 1, 'break', breakMinutes > 0 ? breakMinutes * 60_000 : null, now),
    breaksTaken: closed.breaksTaken + 1,
    interruption: null,
    lastSeenAt: now
  }
}

export function startFocus(session: StudySession, now: number): StudySession {
  const closed = closeSegment(session, now)
  return {
    ...closed,
    segment: newSegment(
      closed.segment.id + 1,
      'focus',
      session.plan.focusMinutes ? session.plan.focusMinutes * 60_000 : null,
      now
    ),
    interruption: null,
    lastSeenAt: now
  }
}

/** Totals for the review screen. An interrupted session ends where Kissa last saw it. */
export function finish(session: StudySession, now: number): StudySession {
  const at = session.interruption ? session.interruption.at : now
  return { ...closeSegment({ ...session, segment: freeze(session.segment, at) }, at), lastSeenAt: now }
}

export function toRecord(
  finished: StudySession,
  endedAt: number,
  reflection: { rating: Rating | null; intentionDone: boolean }
): SessionRecord {
  return {
    id: finished.id,
    intention: finished.intention,
    startedAt: finished.startedAt,
    endedAt,
    focusMs: Math.round(finished.focusMsDone),
    breakMs: Math.round(finished.breakMsDone),
    breaks: finished.breaksTaken,
    plannedFocusMinutes: finished.plan.focusMinutes,
    rating: reflection.rating,
    intentionDone: reflection.intentionDone,
    tasksDone: (finished.tasks ?? []).filter((t) => t.done).length,
    tasksTotal: (finished.tasks ?? []).length,
    thoughts: (finished.thoughts ?? []).map((t) => t.text)
  }
}

/** A saved session that is not shaped as expected is dropped rather than half-trusted. */
export function isValidSession(value: unknown): value is StudySession {
  const s = value as StudySession
  return (
    !!s &&
    s.version === 1 &&
    typeof s.id === 'string' &&
    typeof s.startedAt === 'number' &&
    typeof s.lastSeenAt === 'number' &&
    !!s.segment &&
    (s.segment.kind === 'focus' || s.segment.kind === 'break') &&
    typeof s.segment.elapsedBeforeMs === 'number' &&
    typeof s.focusMsDone === 'number' &&
    typeof s.breakMsDone === 'number'
  )
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`
}

export function formatMinutes(ms: number): string {
  // Rounded down: a review never claims more focus than was counted.
  const minutes = Math.floor(ms / 60_000)
  if (minutes === 0) return 'under a minute'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Focus minutes for each of the last seven days, oldest first (today last). */
export function lastSevenDays(records: SessionRecord[], now: number): { start: number; focusMs: number }[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return { start: d.getTime(), focusMs: 0 }
  })
  for (const r of records) {
    for (let i = days.length - 1; i >= 0; i--) {
      if (r.startedAt >= days[i].start) {
        if (i < days.length - 1 || r.startedAt < days[i].start + DAY_MS) days[i].focusMs += r.focusMs
        break
      }
    }
  }
  return days
}

/** Days in a row, ending today (or yesterday, if today has not reached it yet), that met the goal. */
export function goalStreak(days: { focusMs: number }[], goalMs: number): number {
  if (goalMs <= 0) return 0
  let i = days.length - 1
  if (days[i].focusMs < goalMs) i--
  let streak = 0
  for (; i >= 0 && days[i].focusMs >= goalMs; i--) streak++
  return streak
}
