import type { DesktopLyricsFrame, DesktopLyricsWord } from '../../../../types/desktopLyrics'
import type { LyricLine } from '../lyrics/lrc'

/** Same lead as the lyrics view: the line lights a moment before the voice. */
export const LEAD_IN_SECONDS = 0.15
/** A pause longer than this after a line has ended is a break: no line is "being sung". */
const BREAK_SECONDS = 2.5

type TimedLine = Pick<LyricLine, 'time' | 'text' | 'endTime' | 'tokens'>

export interface DesktopLines {
  current: string
  next: string
  /** The sung line itself, for its start time and word timings. */
  line?: TimedLine
}

/**
 * The line being sung at `time` and the one after it. Before the first line and in long
 * instrumental breaks there is no current line, only the next one to come.
 */
export function pickDesktopLines(lines: readonly TimedLine[], time: number): DesktopLines {
  if (lines.length === 0) return { current: '', next: '' }
  if (time < lines[0].time - LEAD_IN_SECONDS) return { current: '', next: lines[0].text }

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (time < line.time - LEAD_IN_SECONDS) continue
    const after = lines[i + 1]
    const lineEnd = line.endTime ?? line.time + 6
    const ended = time > lineEnd + 0.4
    if (ended && (!after || after.time - lineEnd > BREAK_SECONDS)) {
      return { current: '', next: after?.text ?? '' }
    }
    return { current: line.text, next: after?.text ?? '', line }
  }
  return { current: '', next: '' }
}

export interface FrameInput {
  lines: readonly TimedLine[]
  time: number
  playing: boolean
  /** Kissa fills the screen (full screen or Party mode): the lyrics are already on it. */
  covered: boolean
  accent?: string
}

export function buildFrame({ lines, time, playing, covered, accent }: FrameInput): DesktopLyricsFrame {
  const { current, next, line } = pickDesktopLines(lines, time)
  const frame: DesktopLyricsFrame = {
    visible: playing && !covered && lines.length > 0 && Boolean(current || next),
    // Hidden frames carry no words, so a hidden window never holds stale lines.
    current: playing ? current : '',
    next: playing ? next : '',
    accent
  }
  if (playing && line) {
    frame.lineStart = line.time
    frame.elapsed = Math.max(0, time - line.time)
    frame.words = desktopWords(line)
  }
  return frame
}

/** The line's words with times relative to its start; spaces are left to the page. */
export function desktopWords(line: TimedLine): DesktopLyricsWord[] | undefined {
  if (!line.tokens?.length) return undefined
  const words = line.tokens
    .filter((t) => !t.isWhitespace && t.text.trim())
    .map((t) => ({
      text: t.text.trim(),
      start: Math.max(0, t.startTime - line.time),
      end: Math.max(0, t.endTime - line.time)
    }))
  return words.length ? words : undefined
}

export function frameKey(f: DesktopLyricsFrame): string {
  // Not `elapsed`, which changes every tick; lineStart tells two identical lines apart.
  return `${f.visible ? 1 : 0}\u0000${f.current}\u0000${f.next}\u0000${f.accent ?? ''}\u0000${f.lineStart ?? ''}`
}

/**
 * Wraps the IPC send so a frame goes out only when what it shows changes: the playback clock
 * ticks every animation frame, but the window hears from it once per line.
 */
export function createFrameSender(send: (frame: DesktopLyricsFrame) => void): {
  push: (frame: DesktopLyricsFrame) => boolean
  reset: () => void
} {
  let last = ''
  return {
    push(frame) {
      const key = frameKey(frame)
      if (key === last) return false
      last = key
      send(frame)
      return true
    },
    reset() {
      last = ''
    }
  }
}
