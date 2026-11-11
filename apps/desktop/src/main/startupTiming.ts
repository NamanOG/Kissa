import { app, ipcMain } from 'electron'
import { appendFileSync } from 'fs'
import { join } from 'path'

/**
 * Start-up timeline, from the moment the process started: when the window was created, painted,
 * shown and maximised, and when the page rendered, ran its opening and became interactive.
 * Written to the console and to userData/startup-timing.log (one block per launch), so a packaged
 * build can be measured too.
 */
const PROCESS_START = Date.now() - process.uptime() * 1000
const marks: Array<[string, number]> = []
let flushed = false

export function startupMark(name: string, at = Date.now()): void {
  const ms = Math.round(at - PROCESS_START)
  if (marks.some(([n]) => n === name)) return
  marks.push([name, ms])
  console.log(`[startup] ${name} +${ms}ms`)
  if (name === 'interactive') flush()
}

function flush(): void {
  if (flushed) return
  flushed = true
  try {
    const line = `${new Date().toISOString()} ${app.isPackaged ? 'packaged' : 'dev'} ${marks.map(([n, ms]) => `${n}=${ms}`).join(' ')}\n`
    appendFileSync(join(app.getPath('userData'), 'startup-timing.log'), line)
  } catch {
    // Timing is a diagnostic only.
  }
}

/** The page reports its own marks (first render, opening start and end, first interactive frame). */
export function listenForPageMarks(): void {
  ipcMain.on('kissa:startup-mark', (_e, name: unknown, at: unknown) => {
    if (typeof name !== 'string' || name.length > 40) return
    startupMark(name, typeof at === 'number' && Number.isFinite(at) ? at : Date.now())
  })
}
