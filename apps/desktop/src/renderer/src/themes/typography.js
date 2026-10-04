// Every typeface ships inside the app (see main.tsx), so Kissa looks the same offline
// and never asks a font server for anything.
module.exports = {
  fontFamily: {
    sans: [
      '"Plus Jakarta Sans Variable"',
      '"Segoe UI Variable"',
      '"Segoe UI"',
      'Inter',
      'sans-serif'
    ],
    serif: ['"Cormorant Garamond Variable"', 'Georgia', 'serif'],
    mono: ['"JetBrains Mono Variable"', '"Cascadia Code"', 'Consolas', 'monospace'],
    'kissa-chassis': ['"Inter"', '"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
    'kissa-editorial': ['"Cormorant Garamond Variable"', 'Georgia', 'serif'],
    'kissa-lyrics': ['"Inter"', '"Segoe UI Variable"', '"Segoe UI"', 'sans-serif']
  }
}
