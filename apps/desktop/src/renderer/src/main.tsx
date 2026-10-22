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
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
