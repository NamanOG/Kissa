/**
 * The line shown on the deck when nothing is playing. It changes with the hour and
 * uses the listener's name when they have given one.
 */
export function greetingFor(now: Date, name: string): string {
  const hour = now.getHours()
  const part =
    hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Late night'
  const who = name.trim()
  if (part === 'Still up') return who ? `Still up, ${who}?` : 'Still up?'
  return who ? `${part}, ${who}.` : `${part}.`
}

/** "Naman's" / "Chris'" — for headings like "Naman's Records". */
export function possessive(name: string): string {
  const who = name.trim()
  if (!who) return ''
  return /s$/i.test(who) ? `${who}'` : `${who}'s`
}
