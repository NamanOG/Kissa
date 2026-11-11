/**
 * Work that would disturb the opening waits for it: starting the system-audio capture made
 * Windows hold the window's frames for ~0.3 s (measured 2026-11-11), visible as a stall in the
 * middle of the opening. StartupExperience holds the gate while it plays; with no opening (tests,
 * the screensaver) the gate is open.
 */
let release: (() => void) | null = null
let gate: Promise<void> = Promise.resolve()

/** Close the gate until the returned release is called. */
export function holdForOpening(): () => void {
  if (!release) {
    gate = new Promise<void>((r) => (release = r))
    // Never held for long, whatever happens to the opening.
    setTimeout(openGate, 15000)
  }
  return openGate
}

function openGate(): void {
  const r = release
  release = null
  r?.()
}

/** True while the opening holds the gate. */
export function openingHeld(): boolean {
  return release !== null
}

/** Resolves once the opening has finished (at once when none is playing). */
export function afterOpening(): Promise<void> {
  return gate
}
