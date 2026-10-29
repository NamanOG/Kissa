/**
 * One shared beat for everything on screen that moves.
 *
 * On a 120 or 144 Hz display, each movement that keeps its own timing (the record, the progress
 * bar, the meter, Moving light) lands on a different refresh, so together they make the window
 * draw on nearly every refresh. Measured on a 144 Hz laptop with integrated graphics: 90 to 140
 * frames a second and the graphics chip close to 100%. Stepping them all on the same 60 Hz beat
 * lets them share frames, so the window draws at most 60 times a second however fast the display.
 *
 * Animation frame times come from the display, and the compositor steps its own animations on
 * the same times, so loops and animations that agree on the beat change on the same frame.
 */
export const BEAT_MS = 1000 / 60

/**
 * Which slot of slotMs a frame time falls in. Frame times sit on the refresh grid, and a refresh
 * can fall a hair either side of a slot boundary in floating point, so a refresh within half a
 * millisecond of the boundary counts as the new slot.
 */
export const slotOf = (t: number, slotMs: number): number => Math.floor((t + 0.5) / slotMs)

/** Which beat a frame time falls in (every = 2 for a 30 Hz beat, and so on). */
export const beatOf = (t: number, every = 1): number => slotOf(t, BEAT_MS * every)

/** How long to sleep after a frame in beat b, waking a little before the next beat begins. */
export const sleepUntilNextBeat = (t: number, b: number, every = 1): number =>
  Math.max(0, (b + 1) * BEAT_MS * every - 0.5 - t - 5)

/**
 * Lines a running animation's steps up with the beat: a stepped animation whose step is one beat
 * long changes on exactly the frames the loops use. Moves it by at most half a beat (8 ms).
 */
export function alignToBeat(animation: Animation): void {
  const start = animation.startTime
  if (typeof start !== 'number' || animation.playbackRate === 0) return
  animation.startTime = Math.round(start / BEAT_MS) * BEAT_MS
}
