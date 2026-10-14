import { ipcMain, powerSaveBlocker } from 'electron'

/**
 * Keeps the display on while a study session is running, the way a video player does, so
 * Windows does not start the screensaver (Kissa's or any other) or turn the screen off in
 * the middle of a sitting. Reading a paper book leaves the mouse untouched for a long time;
 * the session should not be covered for that.
 *
 * The renderer asks for it only while a session is running and the person has not turned
 * it off; pausing, finishing or leaving the session releases it. Locking Windows still
 * works as usual.
 */
let blockerId: number | null = null

function set(on: boolean): void {
  if (on && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!on && blockerId !== null) {
    if (powerSaveBlocker.isStarted(blockerId)) powerSaveBlocker.stop(blockerId)
    blockerId = null
  }
}

export function startStudyKeepAwake(): void {
  ipcMain.handle('kissa:study-keep-awake', (_event, on: unknown) => {
    set(on === true)
    return blockerId !== null
  })
}

export function stopStudyKeepAwake(): void {
  set(false)
}
