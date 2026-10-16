import type { FeaturePageData } from '../data/featurePages'

/** Shared by the browser and build-time renderer, so the indexable copy cannot drift. */
export function FeaturePage({ page, base = '/' }: { page: FeaturePageData; base?: string }) {
  return (
    <>
      <header className="guide-header container">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <a href={base} className="guide-brand"><img src={`${base}kissa-logo.svg`} width="28" height="28" alt="" />Kissa</a>
        <a href={base}>Back to the listening room</a>
      </header>
      <main id="main-content" tabIndex={-1} className="guide container">
        <p className="label">{page.label}</p>
        <h1>{page.heading}</h1>
        <p className="guide-intro">{page.intro}</p>
        <a className="guide-download" href="https://apps.microsoft.com/detail/9p3n4x4wm80j">Get Kissa from Microsoft Store ↗</a>
        <p className="guide-platform">Free · Windows 10 &amp; 11</p>
        <figure>
          <img src={`${base}${page.image}`} width="1600" height="1000" alt={page.imageAlt} fetchPriority="high" />
          <figcaption>{page.imageAlt}. Captured in the desktop app.</figcaption>
        </figure>
        <div className="guide-sections">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <div>{section.paragraphs.map((text) => <p key={text}>{text}</p>)}</div>
            </section>
          ))}
        </div>
        <aside className="guide-related" aria-label="More about Kissa">
          <span className="label">Keep exploring</span>
          <a href={`${base}${page.related}/`}>{page.related === 'study-room' ? 'Inside the Study Room' : 'Music and study status on Discord'} →</a>
          <a href={`${base}#faq`}>Questions about Kissa →</a>
        </aside>
      </main>
      <footer className="guide-footer container">
        <p>Kissa · Vinyl player for Windows</p>
        <a href="https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md">Privacy</a>
        <a href="https://www.glyphcode.studio/">Made by GlyphCode</a>
      </footer>
    </>
  )
}
