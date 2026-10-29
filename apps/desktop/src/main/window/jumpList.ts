/**
 * Taskbar jump list: right-click Kissa on the taskbar to open a part of the app directly.
 * Each task starts Kissa with `--kissa-open=<place>`; a running Kissa receives it through
 * `second-instance`, a fresh one keeps it until the renderer asks for it.
 */
export const JUMP_PLACES = ['lyrics', 'shelf', 'focus', 'mini'] as const
export type JumpPlace = (typeof JUMP_PLACES)[number]

const FLAG = '--kissa-open='

export function jumpPlaceFromArgv(argv: readonly string[]): JumpPlace | null {
  for (const arg of argv) {
    if (!arg.startsWith(FLAG)) continue
    const place = arg.slice(FLAG.length) as JumpPlace
    if ((JUMP_PLACES as readonly string[]).includes(place)) return place
  }
  return null
}

export type JumpLabels = Partial<Record<JumpPlace, string>>

const DEFAULT_LABELS: Record<JumpPlace, string> = {
  lyrics: 'Lyrics',
  shelf: 'Shelf',
  focus: 'Focus room',
  mini: 'Mini player'
}

export interface JumpTask {
  program: string
  arguments: string
  iconPath: string
  iconIndex: number
  title: string
  description: string
}

export function buildJumpTasks(execPath: string, labels: JumpLabels = {}): JumpTask[] {
  return JUMP_PLACES.map((place) => {
    const title = typeof labels[place] === 'string' && labels[place]!.trim()
      ? labels[place]!.trim().slice(0, 40)
      : DEFAULT_LABELS[place]
    return {
      program: execPath,
      arguments: `${FLAG}${place}`,
      iconPath: execPath,
      iconIndex: 0,
      title,
      description: title
    }
  })
}
