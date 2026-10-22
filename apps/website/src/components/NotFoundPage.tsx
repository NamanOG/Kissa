import { brandMark } from '../lib/brandMark'

export function NotFoundPage({ base = '/', showSupport = false }: { base?: string; showSupport?: boolean }) {
  return (
    <div className="not-found-page">
      <header className="not-found-page-header">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <a href={base} className="not-found-page-brand" aria-label="Kissa home">
          <img {...brandMark(base, 30)} width="30" height="30" alt="" />
          Kissa
        </a>
        <a href={base} className="not-found-page-button">Back to Kissa</a>
      </header>

      <main id="main-content" tabIndex={-1} className="not-found-page-main">
        <section className="not-found-page-hero" aria-labelledby="error-code">
          <h1 id="error-code" className="not-found-page-code" aria-label="Error 404">
            <span className="not-found-page-label">Error</span>
            <span className="not-found-page-number">404</span>
          </h1>
          <div className="not-found-page-message">
            <h2>Page not found.</h2>
            <p>This page may have moved, or the link may be incorrect. Let&apos;s get you back to Kissa.</p>
            <div className="not-found-page-actions">
              <a href={base} className="not-found-page-button not-found-page-primary">Back to Kissa</a>
              <a href="https://apps.microsoft.com/detail/9p3n4x4wm80j" className="not-found-page-button" target="_blank" rel="noopener noreferrer" aria-label="Get Kissa from Microsoft Store (opens in a new tab)">Get the app</a>
            </div>
          </div>
        </section>

        <nav className="not-found-page-explore" aria-label="Other pages on Kissa">
          <p className="not-found-page-label">Explore Kissa</p>
          <div className="not-found-page-links">
            <a href={`${base}study-room/`} className="not-found-page-button">Focus Room</a>
            <a href={`${base}discord-music-status/`} className="not-found-page-button">Discord status</a>
            <a href={`${base}#faq`} className="not-found-page-button">Help &amp; FAQ</a>
            {showSupport && <a href={`${base}support/`} className="not-found-page-button">Support Kissa</a>}
          </div>
        </nav>
      </main>

      <footer className="not-found-page-footer">
        <p>Kissa. A free vinyl player for Windows.</p>
        <nav aria-label="Site information">
          <a href="https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md" className="not-found-page-button">Privacy</a>
          <a href="https://www.glyphcode.studio/" className="not-found-page-button">Made by GlyphCode</a>
        </nav>
      </footer>
    </div>
  )
}
