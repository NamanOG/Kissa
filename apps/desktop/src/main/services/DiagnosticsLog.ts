import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname } from 'path'

/**
 * A small local record of process failures (a crashed helper, a renderer that went away,
 * a window that stopped responding) so a crash or hang reported through the Store can be
 * matched to its cause on the user's own PC. It stays on this computer and is never sent
 * anywhere. Entries carry event names, exit codes and durations only: no track, lyrics or
 * Study Room details, and no file paths.
 */
export interface DiagnosticsFs {
  append(path: string, text: string): void
  size(path: string): number
  read(path: string): string
  write(path: string, text: string): void
}

const nodeFs: DiagnosticsFs = {
  append(path, text) {
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, text, 'utf8')
  },
  size(path) {
    try {
      return statSync(path).size
    } catch {
      return 0
    }
  },
  read: (path) => readFileSync(path, 'utf8'),
  write: (path, text) => writeFileSync(path, text, 'utf8')
}

type Detail = Record<string, string | number | boolean | null | undefined>

const SAFE_VALUE = /^[\w.:+-]{0,64}$/

export class DiagnosticsLog {
  constructor(
    private readonly filePath: string,
    private readonly maxBytes = 64 * 1024,
    private readonly fs: DiagnosticsFs = nodeFs,
    private readonly now: () => Date = () => new Date()
  ) {}

  record(event: string, detail: Detail = {}): void {
    try {
      const parts = Object.entries(detail)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${DiagnosticsLog.clean(v ?? null)}`)
      const line = [this.now().toISOString(), DiagnosticsLog.clean(event), ...parts].join(' ') + '\n'

      if (this.fs.size(this.filePath) + line.length > this.maxBytes) {
        // Keep the newer half so the log stays small without losing the latest events.
        const kept = this.fs.read(this.filePath)
        const tail = kept.slice(Math.floor(kept.length / 2))
        this.fs.write(this.filePath, tail.slice(tail.indexOf('\n') + 1))
      }
      this.fs.append(this.filePath, line)
    } catch {
      // Diagnostics must never take the app down with them.
    }
  }

  private static shared: DiagnosticsLog | null = null

  /** The app's log, once `useFile` has named where it lives; until then events are dropped. */
  static get(): DiagnosticsLog | null {
    return DiagnosticsLog.shared
  }

  static useFile(filePath: string): DiagnosticsLog {
    DiagnosticsLog.shared = new DiagnosticsLog(filePath)
    return DiagnosticsLog.shared
  }

  /** Values are limited to short tokens (codes, reasons, numbers); anything else is dropped. */
  private static clean(value: string | number | boolean | null): string {
    const text = String(value)
    return SAFE_VALUE.test(text) ? text : 'redacted'
  }
}
