/**
 * When the needle is heard. A turntable makes its needle sounds at two physical moments: the
 * stylus touching the groove (contact, then a moment of lead-in groove) and the stylus leaving
 * it (lift). Moving the lifted arm through the air is silent.
 *
 * The visible tonearm reports those moments as they happen in its animation (TonearmAssembly),
 * so the sound lines up with the landing and the departure, including when the user picks the
 * arm up and drops it on another groove while the music keeps playing. Where no arm is on
 * screen (Lyrics, Shelf, Study, full screen, the mini player), playback changes stand in for
 * it, timed like the arm would be.
 *
 * One shared "in the groove" state makes every path safe to call more than once: a second
 * contact without a lift in between, or a lift without contact, is silent.
 */
import { playDeckSound } from './deckSounds'

/** The arm's travel to the record and its lowering (TonearmAssembly: 600 ms + 250 ms). */
export const ARM_TRAVEL_MS = 850
/** Right after start-up Kissa catches up with what is already playing; that is not a gesture. */
export const QUIET_START_MS = 2500

let inGroove = false
let armsOnScreen = 0
let pendingContact: ReturnType<typeof setTimeout> | null = null
let startedAt = typeof performance !== 'undefined' ? performance.now() : 0
let now = (): number => performance.now()

const quiet = (): boolean => now() - startedAt < QUIET_START_MS

function clearPending(): void {
  if (pendingContact) clearTimeout(pendingContact)
  pendingContact = null
}

/** The stylus has touched the record. */
export function needleContact(): void {
  clearPending()
  if (inGroove) return
  inGroove = true
  if (!quiet()) playDeckSound('needleDrop')
}

/** The stylus has left the record. */
export function needleLift(): void {
  clearPending()
  if (!inGroove) return
  inGroove = false
  if (!quiet()) playDeckSound('needleLift')
}

/** A visible tonearm takes over the needle sounds while it is mounted. */
export function registerTonearm(): () => void {
  armsOnScreen++
  clearPending()
  return () => {
    armsOnScreen = Math.max(0, armsOnScreen - 1)
  }
}

/**
 * Playback started or stopped while no arm is on screen: contact after the arm's usual travel
 * (cancelled if playback stops first), lift at once.
 */
export function needleFollowPlayback(isPlaying: boolean): void {
  if (armsOnScreen > 0) return
  if (isPlaying) {
    if (inGroove || pendingContact) return
    pendingContact = setTimeout(() => {
      pendingContact = null
      if (armsOnScreen === 0) needleContact()
    }, ARM_TRAVEL_MS)
  } else {
    needleLift()
  }
}

/** Tests only. */
export function resetNeedleForTest(opts: { startedAt?: number; now?: () => number } = {}): void {
  clearPending()
  inGroove = false
  armsOnScreen = 0
  now = opts.now ?? (() => performance.now())
  startedAt = opts.startedAt ?? -Infinity
}

/** Tests only. */
export function needleStateForTest(): { inGroove: boolean; armsOnScreen: number; pending: boolean } {
  return { inGroove, armsOnScreen, pending: pendingContact !== null }
}
