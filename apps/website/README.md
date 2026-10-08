# Kissa - Marketing Website

The official marketing website for **Kissa**, a contemplative desktop vinyl player and music companion for Windows 10 & 11.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 7](https://vite.dev/)
- **Styling**: Vanilla CSS Modules with design tokens (`src/styles/tokens.css`)
- **Animation**: [Motion](https://motion.dev/) (`motion/react`) for spring physics and layout transitions
- **Typography**: Mona Sans (one variable family: extended width for display, normal for text) and Martian Mono (labels), from Google Fonts

## Page Structure

The page is a short scrollytelling sequence carried by the Kissa record itself. The record and tonearm are ported from the desktop app's renderer (`ui/Vinyl`, `ui/Tonearm`), so the site shows the real product object.

1. `SiteNav` - a plain floating bar; a tiny spinning record marks the section being read.
2. `Stage` - hero plus the four-step "how it works" story as one pinned scene. Scroll is the needle: Kissa picks up the session, the tonearm cues and drops, then tracks the side while lyric lines keep time. The headline (`ui/TangibleHeading`) swells under the pointer using the variable font's width and weight axes.
3. `Waveline` - a line of type that is flat while the page is still and becomes a travelling sound wave with scroll speed.
4. `Modes` - the screen stays pinned while the six modes scroll past it; each is a short muted loop recorded from the app.
5. `Rooms` - pick a room and the app is shown in it: the same window and record, only the light changes.
6. `Sleeve` - the feature list as the back of an LP (two sides, eight tracks) on the one full-colour copper section; the record slides out of its jacket on scroll.
7. `Faq` - the questions people search for, also published as FAQ structured data.
8. `DownloadCta` and `SiteFooter` - the record again, turning at 33⅓.

Section boundaries are `ui/PluckString`: hairlines that bow and ring like a string when the pointer crosses them.

Motion references (from the UI Reference System): `PluckString`, `TangibleHeading` and `Waveline` adapt Fancy Components' Elastic Line, Variable Font Cursor Proximity and Marquee Along SVG Path. All of it is disabled under `prefers-reduced-motion`, and pointer effects are off on touch devices.

Design rules: flat colour for the interface (no decorative gradients, glows or textures), copper as the single accent, hierarchy from type, space and thin rules. Gradients appear only inside `ui/Vinyl` and `ui/Tonearm`, where they render physical materials.

## Publishing & search

- **Site URL**: set once in `vite.config.ts` (`SITE_URL`, or the `KISSA_SITE_URL` environment variable). The canonical link, social preview image, `robots.txt`, `sitemap.xml`, structured data and the asset base path are all derived from it.
- **Deploy**: `.github/workflows/website.yml` builds and publishes to GitHub Pages on every website change. One-time setup: repository Settings → Pages → Source: "GitHub Actions".
- **Structured data**: `SoftwareApplication` (Store link, price) and `FAQPage` are generated at build time; the FAQ text comes from `src/data/faq.json`, which also feeds the visible FAQ section.
- **Files in `public/`** must be referenced through `asset()` (`src/lib/asset.ts`) so they resolve under a sub-path such as `/Kissa/`.
- **Media**: `python scripts/process-captures.py` turns the recordings in `captures/` into the clips, stills and link-preview card under `public/`.
- **Rooms**: `python scripts/sync-rooms.py` regenerates `src/data/rooms.ts` from the desktop app's `themes.ts`; run it when the app's rooms change.

## Downloads

Every download button opens Kissa's Microsoft Store page (`STORE_URL` in `src/lib/links.ts`, and again in `vite.config.ts` for the structured data).

## Project Structure

```text
apps/website/
├── public/                  # Static assets
│   ├── media/               # Mode clips, room stills and the record label (generated from captures/)
│   ├── kissa-logo.svg       # The mark: nav and favicon
│   ├── favicon.png          # 180px fallback and touch icon
│   └── og.jpg               # Link preview card
├── captures/                # Raw recordings (git-ignored) and the capture guide
├── src/
│   ├── components/          # Page sections & composite components
│   │   └── ui/              # Primitives: Vinyl, Tonearm, PluckString, TangibleHeading, DownloadButton, Reveal, MagneticButton
│   ├── data/                # Listening rooms, FAQ
│   ├── lib/                 # asset(), Store and GitHub links
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
