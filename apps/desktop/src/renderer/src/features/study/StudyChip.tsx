import React, { useEffect, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { useStudyStore } from '@renderer/stores/studyStore'
import { formatClock, isRunning, segmentElapsed, segmentRemaining } from './studySession'

/**
 * The session in one quiet line, for places away from the Study Room (the mini player
 * beside a document or browser). Renders nothing without a session.
 */
export function StudyChip({ className, onOpen }: { className?: string; onOpen?: () => void }): React.JSX.Element | null {
  const session = useStudyStore((s) => s.active)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!session) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return (): void => window.clearInterval(id)
  }, [session])

  if (!session) return null
  const { segment } = session
  const remaining = segmentRemaining(segment, now)
  const time = formatClock(remaining ?? segmentElapsed(segment, now))
  const label = session.interruption
    ? 'Study paused'
    : segment.ended
      ? segment.kind === 'focus'
        ? 'Block done'
        : 'Break over'
      : segment.kind === 'break'
        ? 'Break'
        : isRunning(session)
          ? 'Studying'
          : 'Study paused'

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', isRunning(session) ? 'bg-tone' : 'bg-dim')}
      />
      <span>{label}</span>
      <span className="tabular-nums text-ink">{time}</span>
    </>
  )
  const classes = cn(
    'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-dim',
    className
  )

  return onOpen ? (
    <button type="button" onClick={onOpen} className={cn(classes, 'cursor-pointer hover:text-ink')} title="Open the Study Room">
      {content}
    </button>
  ) : (
    <span className={classes}>{content}</span>
  )
}
