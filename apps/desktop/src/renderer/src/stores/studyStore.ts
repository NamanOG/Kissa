import { create } from 'zustand'
import {
  advance,
  extend,
  finish,
  isValidSession,
  pause,
  resume,
  startBreak,
  startFocus,
  startSession,
  toRecord,
  type Rating,
  type SessionPlan,
  type SessionRecord,
  type StudySession,
  type StudyTask
} from '@renderer/features/study/studySession'
import type { StudyEnvironment } from '@renderer/features/study/scenes'

/**
 * Study Room state: the active session, the session being reviewed, a modest local
 * history and a few preferences. Everything stays on this computer, in localStorage,
 * written on every change (and every tick while running) so a crash loses seconds.
 */

const STORAGE_KEY = 'kissa_study_v1'
const HISTORY_LIMIT = 200

export interface StudyPrefs {
  plan: SessionPlan
  /** A soft chime when a focus block or break ends. */
  chime: boolean
  /** Keep the room's colours steady while a session runs instead of following each cover. */
  holdRoomColor: boolean
  /** The Study Room's surroundings. */
  environment: StudyEnvironment
  /** A quiet generated sound bed for the environment while the Study Room is open. */
  ambience: boolean
  /** Focus minutes a day the person is aiming for; 0 hides the goal. */
  dailyGoalMinutes: number
}

interface Persisted {
  version: 1
  active: StudySession | null
  review: StudySession | null
  history: SessionRecord[]
  prefs: StudyPrefs
  lastIntention?: string
}

export const DEFAULT_PREFS: StudyPrefs = {
  plan: { focusMinutes: 50, breakMinutes: 10 },
  chime: true,
  holdRoomColor: true,
  environment: 'rain',
  ambience: false,
  dailyGoalMinutes: 120
}

function load(): Persisted {
  const empty: Persisted = { version: 1, active: null, review: null, history: [], prefs: DEFAULT_PREFS }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (parsed.version !== 1) return empty
    return {
      version: 1,
      active: isValidSession(parsed.active) ? parsed.active : null,
      review: isValidSession(parsed.review) ? parsed.review : null,
      history: Array.isArray(parsed.history) ? parsed.history.filter((r) => r && typeof r.id === 'string').slice(0, HISTORY_LIMIT) : [],
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs || {}), plan: { ...DEFAULT_PREFS.plan, ...(parsed.prefs?.plan || {}) } },
      lastIntention: typeof parsed.lastIntention === 'string' ? parsed.lastIntention : undefined
    }
  } catch {
    return empty
  }
}

function save(state: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable: the session still runs, it just would not survive a restart.
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface StudyState extends Persisted {
  start: (intention: string, plan: SessionPlan, tasks?: string[]) => void
  addTask: (text: string) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  parkThought: (text: string) => void
  removeThought: (at: number) => void
  tick: (now?: number) => void
  pause: () => void
  resume: () => void
  extend: () => void
  takeBreak: (minutes?: number) => void
  backToFocus: () => void
  /** Stops the session and opens the review. */
  finish: () => void
  /** Saves the reviewed session to history. */
  saveReview: (reflection: { rating: Rating | null; intentionDone: boolean }) => void
  discard: () => void
  markAnnounced: (segmentId: number) => void
  setPrefs: (prefs: Partial<StudyPrefs>) => void
  deleteRecord: (id: string) => void
  clearHistory: () => void
}

/** Restoring loses at most this much observed time after a crash. */
const HEARTBEAT_SAVE_MS = 10_000
let lastHeartbeatSave = 0

const initial = load()
// A session restored after a restart, a crash or sleep is checked against the clock at once.
if (initial.active) initial.active = advance(initial.active, Date.now())

export const useStudyStore = create<StudyState>((set, get) => {
  const commit = (patch: Partial<Persisted>): void => {
    set(patch)
    const s = get()
    save({
      version: 1,
      active: s.active,
      review: s.review,
      history: s.history,
      prefs: s.prefs,
      lastIntention: s.lastIntention
    })
  }
  const update = (fn: (session: StudySession, now: number) => StudySession): void => {
    const active = get().active
    if (!active) return
    commit({ active: fn(active, Date.now()) })
  }

  return {
    ...initial,

    start: (intention, plan, tasks = []) => {
      const now = Date.now()
      const list: StudyTask[] = tasks
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ id: newId(), text: text.slice(0, 120), done: false }))
      commit({
        active: startSession(intention, plan, now, newId(), list),
        review: null,
        lastIntention: intention.trim() || undefined,
        prefs: { ...get().prefs, plan }
      })
    },
    tick: (now = Date.now()) => {
      const active = get().active
      if (!active) return
      const next = advance(active, now)
      if (next === active) return
      const onlyHeartbeat =
        next.segment === active.segment && next.interruption === active.interruption && next.focusMsDone === active.focusMsDone
      // The heartbeat itself is written every few seconds; real changes at once.
      if (onlyHeartbeat && now - lastHeartbeatSave < HEARTBEAT_SAVE_MS) {
        set({ active: next })
        return
      }
      lastHeartbeatSave = now
      commit({ active: next })
    },
    addTask: (text) =>
      update((s) =>
        text.trim() && (s.tasks ?? []).length < 8
          ? { ...s, tasks: [...(s.tasks ?? []), { id: newId(), text: text.trim().slice(0, 120), done: false }] }
          : s
      ),
    toggleTask: (id) => {
      const flip = (s: StudySession): StudySession => ({
        ...s,
        tasks: (s.tasks ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      })
      // Tasks can still be ticked off on the review after finishing.
      const { active, review } = get()
      if (active) commit({ active: flip(active) })
      else if (review) commit({ review: flip(review) })
    },
    removeTask: (id) => update((s) => ({ ...s, tasks: (s.tasks ?? []).filter((t) => t.id !== id) })),
    parkThought: (text) =>
      update((s, now) =>
        text.trim() ? { ...s, thoughts: [...(s.thoughts ?? []), { at: now, text: text.trim().slice(0, 240) }].slice(-30) } : s
      ),
    removeThought: (at) => update((s) => ({ ...s, thoughts: (s.thoughts ?? []).filter((t) => t.at !== at) })),
    pause: () => update(pause),
    resume: () => update(resume),
    extend: () => update(extend),
    takeBreak: (minutes) => update((s, now) => startBreak(s, now, minutes)),
    backToFocus: () => update(startFocus),
    finish: () => {
      const active = get().active
      if (!active) return
      commit({ active: null, review: finish(active, Date.now()) })
    },
    saveReview: (reflection) => {
      const review = get().review
      if (!review) return
      const record = toRecord(review, review.lastSeenAt, reflection)
      // Under a minute of focus is not worth a line in the history.
      const history = record.focusMs >= 60_000 ? [record, ...get().history].slice(0, HISTORY_LIMIT) : get().history
      commit({ review: null, history })
    },
    discard: () => commit({ active: null, review: null }),
    markAnnounced: (segmentId) => update((s) => ({ ...s, announcedSegmentId: segmentId })),
    setPrefs: (prefs) => commit({ prefs: { ...get().prefs, ...prefs } }),
    deleteRecord: (id) => commit({ history: get().history.filter((r) => r.id !== id) }),
    clearHistory: () => commit({ history: [] })
  }
})
