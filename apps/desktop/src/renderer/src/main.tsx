// Kissa's two typefaces, shipped inside the app: Newsreader (optical sizes) for titles and
// editorial text, Archivo (weight and width axes) for everything else, including the wide,
// engraved labels that used to be monospace.
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource-variable/archivo/standard.css'
import './assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'

// Measurement builds only (VITE_KISSA_PROBE=1, never set for a release): the player store on
// window, so transitions such as a song change can be driven and timed from DevTools.
if (import.meta.env.VITE_KISSA_PROBE)
  void import('./stores/playerStore').then((m) => {
    ;(window as unknown as { __kissaProbe?: unknown }).__kissaProbe = { player: m.usePlayerStore }
  })
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
)
