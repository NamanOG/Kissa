/** The attribute a tooltip's text moves to, so the native (stock Windows) tooltip never shows. */
export const TIP_ATTR = 'data-kissa-tip'
/** An explicit shortcut for an element's tooltip, shown as a keycap. */
export const SHORTCUT_ATTR = 'data-shortcut'

/** Looks like a key or a key combination: "E", "Space", "Ctrl+Alt+L", "F11", "Esc", "←". */
const KEYLIKE = /^(?:[A-Za-z0-9?/,.;'[\]\\=`-]|Space|Esc|Escape|Enter|Tab|Home|End|PgUp|PgDn|Page Up|Page Down|Del|Delete|F\d{1,2}|[←→↑↓]|(?:Ctrl|Alt|Shift|Win|Cmd)(?:\s*\+\s*[^\s+]+)+)$/i

/**
 * Splits a tooltip like "Change your turntable (E)" into its words and its shortcut. A
 * parenthesis that is not a key ("Party mode (for a TV)") stays part of the words.
 */
export function splitShortcut(text: string): { label: string; shortcut?: string } {
  const match = /^(.*\S)\s*\(([^()]{1,16})\)\s*$/.exec(text.trim())
  if (match && KEYLIKE.test(match[2].trim())) return { label: match[1], shortcut: match[2].trim() }
  return { label: text.trim() }
}

/** The keys of a shortcut, one keycap each: "Ctrl+Alt+L" becomes ["Ctrl", "Alt", "L"]. */
export function shortcutKeys(shortcut: string): string[] {
  return shortcut
    .split('+')
    .map((k) => k.trim())
    .filter(Boolean)
}
