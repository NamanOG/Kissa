import { readHistory, readTallies } from '../session/history'
import type { ListeningUsage } from '../../../../types/reminders'

const dayOf = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * How much Kissa has really been used, from the local listening history the recaps already keep:
 * distinct days with music heard and the time heard, counting the recent months row by row and
 * older months from their tallies. Nothing new is recorded for this.
 */
export function listeningUsage(): ListeningUsage {
  const days = new Set<string>()
  let seconds = 0
  try {
    for (const row of readHistory()) {
      days.add(dayOf(row[0]))
      seconds += row[4]
    }
    for (const tally of Object.values(readTallies())) {
      seconds += tally?.seconds || 0
      for (const day of Object.keys(tally?.days || {})) days.add(day)
    }
  } catch {
    // Unreadable history: no reminders, which is the safe side.
    return { days: 0, seconds: 0 }
  }
  return { days: days.size, seconds }
}
