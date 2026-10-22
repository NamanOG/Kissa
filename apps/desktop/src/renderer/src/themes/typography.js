// Every typeface ships inside the app (see main.tsx), so Kissa looks the same offline
// and never asks a font server for anything.
//
// Two families only. Newsreader is a serif with optical sizes, so big titles stay crisp and
// small italics stay readable. Archivo is a grotesque with a width axis: normal width for
// reading, a wider cut for the engraved, hardware-style labels (see .font-mono in main.css).
const SANS = ['"Archivo Variable"', '"Segoe UI Variable"', '"Segoe UI"', 'sans-serif']
const SERIF = ['"Newsreader Variable"', 'Georgia', 'serif']

module.exports = {
  fontFamily: {
    sans: SANS,
    serif: SERIF,
    // Labels and figures: Archivo, set wide with tabular figures (main.css), not a code font.
    mono: SANS,
    'kissa-chassis': SANS,
    'kissa-editorial': SERIF,
    'kissa-lyrics': SANS
  }
}
