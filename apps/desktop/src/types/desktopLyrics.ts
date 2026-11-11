/** Desktop lyrics: the sung line floating over the desktop in its own window. */

export type DesktopLyricsSize = 's' | 'm' | 'l'

/** What the floating window shows. The renderer sends one only when it changes. */
export interface DesktopLyricsFrame {
  /** False fades the lines out: nothing playing, no timed lyrics, or Kissa fills the screen. */
  visible: boolean
  /** The line being sung ('' in a break or before the first line). */
  current: string
  /** The line after it, shown smaller and fainter. */
  next: string
  /** The room's accent, #rrggbb, to tint the words. */
  accent?: string
  /** When the current line started (seconds into the track): tells repeated lines apart. */
  lineStart?: number
  /** The current line's words with their timings in seconds from the line's start. */
  words?: DesktopLyricsWord[]
  /** How far into the current line playback was when this frame was made, in seconds. */
  elapsed?: number
}

export interface DesktopLyricsWord {
  text: string
  start: number
  end: number
}

export interface DesktopLyricsStatus {
  enabled: boolean
  /** Locked: clicks pass through to whatever is underneath; hovering shows the controls. */
  locked: boolean
  size: DesktopLyricsSize
  /** Whether Ctrl+Alt+L could be registered (another app may own it). */
  shortcut: boolean
}
