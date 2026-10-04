# Kissa — Marketing Website

The official marketing website for **Kissa**, a contemplative desktop vinyl player and music companion for Windows 10 & 11.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 7](https://vite.dev/)
- **Styling**: Vanilla CSS Modules with design tokens (`src/styles/tokens.css`)
- **Animation**: [Motion](https://motion.dev/) (`motion/react`) for spring physics and layout transitions
- **Typography**: Mona Sans (one variable family: extended width for display, normal for text) and Martian Mono (labels), from Google Fonts

## Page Structure

The page is a short scrollytelling sequence carried by the Kissa record itself. The record and tonearm are ported from the desktop app's renderer (`ui/Vinyl`, `ui/Tonearm`), so the site shows the real product object.

1. `SiteNav` — a plain floating bar; a tiny spinning record marks the section being read.
2. `Stage` — hero plus the four-step "how it works" story as one pinned scene. Scroll is the needle: Kissa picks up the session, the tonearm cues and drops, then tracks the side while lyric lines keep time. The headline (`ui/TangibleHeading`) swells under the pointer using the variable font's width and weight axes.
3. `Waveline` — a line of type that is flat while the page is still and becomes a travelling sound wave with scroll speed.
4. `Modes` — the screenshot stays pinned while the six modes scroll past it.
5. `VideoShowcase` — the demo recording.
6. `Rooms` — a live preview: pick a room and the deck is re-lit with the app's own theme values, with the room photograph inset.
7. `Sleeve` — the feature list as the back of an LP (two sides, eight tracks) on the one full-colour copper section; the record slides out of its jacket on scroll.
8. `Faq` — the questions people search for, also published as FAQ structured data.
9. `DownloadCta` and `SiteFooter` — the record again, turning at 33⅓.

Section boundaries are `ui/PluckString`: hairlines that bow and ring like a string when the pointer crosses them.

Motion references (from the UI Reference System): `PluckString`, `TangibleHeading` and `Waveline` adapt Fancy Components' Elastic Line, Variable Font Cursor Proximity and Marquee Along SVG Path. All of it is disabled under `prefers-reduced-motion`, and pointer effects are off on touch devices.

Design rules: flat colour for the interface (no decorative gradients, glows or textures), copper as the single accent, hierarchy from type, space and thin rules. Gradients appear only inside `ui/Vinyl` and `ui/Tonearm`, where they render physical materials.

## Publishing & search

- **Site URL**: set once in `vite.config.ts` (`SITE_URL`, or the `KISSA_SITE_URL` environment variable). The canonical link, social preview image, `robots.txt`, `sitemap.xml`, structured data and the asset base path are all derived from it.
- **Deploy**: `.github/workflows/website.yml` builds and publishes to GitHub Pages on every website change and after each app release (so the baked-in version and download link stay current). One-time setup: repository Settings → Pages → Source: "GitHub Actions".
- **Structured data**: `SoftwareApplication` (version, download URL, price) and `FAQPage` are generated at build time; the FAQ text comes from `src/data/faq.json`, which also feeds the visible FAQ section.
- **Files in `public/`** must be referenced through `asset()` (`src/lib/asset.ts`) so they resolve under a sub-path such as `/Kissa/`.
- **Rooms**: `python scripts/sync-rooms.py` regenerates `src/data/rooms.ts` from the desktop app's `themes.ts`; run it when the app's rooms change.

## Downloads

Every Download control links straight to the installer asset (`Kissa-Setup-x.y.z.exe`), so a click starts the download in place.

- `vite.config.ts` resolves the latest GitHub release **at build time** and bakes it into the bundle (`__KISSA_RELEASE__`). Set `GITHUB_TOKEN` in CI to avoid API rate limits.
- If GitHub can't be reached during a build, `src/data/release.json` is used. **Update that file when you cut a release** (or just rebuild the site after publishing).
- In the browser, `useLatestRelease` starts from the baked-in release and quietly upgrades the link if a newer release has shipped since the build.

## Project Structure

```text
apps/website/
├── public/                  # Static assets
│   ├── media/               # Optimized WebP screenshots, room photos and logo (used by the site)
│   ├── environments/        # Original listening room photography (source files)
│   ├── product/             # Original product screenshots & demo video
│   ├── favicon.png
│   ├── kissa_logo.png
│   └── kissa_welcome_hero.jpg
├── src/
│   ├── components/          # Page sections & composite components
│   │   └── ui/              # Primitives: Vinyl, Tonearm, PluckString, TangibleHeading, DownloadButton, Reveal, MagneticButton
│   ├── data/                # Listening rooms, release.json (download fallback)
│   ├── hooks/               # useLatestRelease (GitHub release lookup)
│   ├── styles/              # Global reset, design tokens, and base typography
│   ├── App.tsx              # Root page composition
│   └── main.tsx             # Application entry point
├── index.html               # Semantic HTML with SEO meta & JSON-LD schema
└── vite.config.ts           # Vite build and dev configuration
```

## Getting Started

### Development

```bash
# From repository root
npm run website:dev

# Or within apps/website
npm run dev
```

The development server starts at `http://localhost:5174/`.

### Quality Checks

```bash
# Typecheck
npm run website:typecheck

# Lint
npm run website:lint

# Production build
npm run website:build
```
