/**
 * Kissa's motion vocabulary: one set of curves, durations and springs, so every part of the app
 * moves the same way. An exit is never longer than its entrance.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const // entrances, opens
export const EASE_EXIT = [0.4, 0, 1, 1] as const // exits
export const EASE_MOVE = [0.65, 0, 0.35, 1] as const // on-screen things changing place
export const DUR = {
  press: 0.1,
  fade: 0.14,
  popIn: 0.22,
  popOut: 0.14,
  pageIn: 0.3,
  pageOut: 0.16,
  sheetIn: 0.3,
  sheetOut: 0.18
} as const
export const SPRING_INDICATOR = { type: 'spring', stiffness: 400, damping: 34 } as const // nav marker, tab plates
export const SPRING_SWITCH = { type: 'spring', stiffness: 700, damping: 40, mass: 0.6 } as const
export const SPRING_CARD = { type: 'spring', visualDuration: 0.42, bounce: 0 } as const // toasts, reminder, notices
export const SPRING_PANEL = { type: 'spring', visualDuration: 0.5, bounce: 0 } as const // large panels
