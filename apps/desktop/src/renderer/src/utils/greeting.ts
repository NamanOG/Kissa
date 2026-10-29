import { tl } from '@renderer/i18n'
/**
 * The line shown on the deck when nothing is playing. It changes with the hour and
 * uses the listener's name when they have given one.
 */
export function greetingFor(now: Date, name: string): string {
  const hour = now.getHours()
  const who = name.trim()
  if (hour < 5) return who ? tl('greet.stillUpName', { name: who }) : tl('greet.stillUp')
  const part = tl(
    hour < 12 ? 'greet.morning' : hour < 17 ? 'greet.afternoon' : hour < 22 ? 'greet.evening' : 'greet.late'
  )
  return who ? `${part}, ${who}.` : `${part}.`
}

/** "Naman's" / "Chris'" — for headings like "Naman's Records". */
export function possessive(name: string): string {
  const who = name.trim()
  if (!who) return ''
  return /s$/i.test(who) ? `${who}'` : `${who}'s`
}
