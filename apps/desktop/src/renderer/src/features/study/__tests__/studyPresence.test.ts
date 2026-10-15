import { describe, expect, it } from 'vitest'
import { studyPresence } from '../useStudyEngine'
import { DEFAULT_PREFS } from '@renderer/stores/studyStore'
import type { StudySession } from '../studySession'

function session(over: Partial<StudySession> = {}): StudySession {
  return {
    version: 1,
    id: 's1',
    intention: 'Private thesis chapter',
    plan: { focusMinutes: 50, breakMinutes: 10 },
    startedAt: 1_000,
    segment: { id: 1, kind: 'focus', plannedMs: 50 * 60_000, elapsedBeforeMs: 60_000, runningSince: 10_000, ended: false },
    focusMsDone: 0,
    breakMsDone: 0,
    breaksTaken: 0,
    focusBlocksDone: 0,
    lastSeenAt: 10_000,
    interruption: null,
    announcedSegmentId: null,
    tasks: [
      { id: 'a', text: 'Secret step', done: true },
      { id: 'b', text: 'Another', done: false }
    ],
    ...over
  }
}

describe('studyPresence', () => {
  it('is null without a session', () => {
    expect(studyPresence({ active: null, prefs: DEFAULT_PREFS })).toBeNull()
  })

  it('gives the room, the end of the block and a step count, never the text', () => {
    const p = studyPresence({ active: session(), prefs: { ...DEFAULT_PREFS, environment: 'forest' } })
    expect(p).toEqual({ phase: 'focus', room: 'Forest room', endsAt: 10_000 + 50 * 60_000 - 60_000, round: 1, tasksTotal: 2, tasksDone: 1 })
    expect(JSON.stringify(p)).not.toMatch(/thesis|Secret/)
  })

  it('counts up for an open block and reads paused when stopped', () => {
    const open = session({ segment: { id: 2, kind: 'focus', plannedMs: null, elapsedBeforeMs: 5_000, runningSince: 20_000, ended: false } })
    expect(studyPresence({ active: open, prefs: DEFAULT_PREFS })?.startedAt).toBe(15_000)
    const paused = session({ segment: { id: 3, kind: 'focus', plannedMs: null, elapsedBeforeMs: 5_000, runningSince: null, ended: false } })
    expect(studyPresence({ active: paused, prefs: DEFAULT_PREFS })).toMatchObject({ phase: 'paused' })
  })
})
