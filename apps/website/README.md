# Kissa — Marketing Website

The official marketing website for **Kissa**, a contemplative desktop vinyl player and music companion for Windows 10 & 11.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 7](https://vite.dev/)
- **Styling**: Vanilla CSS Modules with design tokens (`src/styles/tokens.css`)
- **Animation**: [Motion](https://motion.dev/) (`motion/react`) for spring physics and layout transitions
- **Typography**: Instrument Serif, Plus Jakarta Sans, JetBrains Mono

## Project Structure

```text
apps/website/
├── public/                  # Static assets
│   ├── environments/        # Listening room environment photography
│   ├── product/             # High-resolution product screenshots & demo video
│   ├── favicon.png
│   ├── kissa_logo.png
│   └── kissa_welcome_hero.jpg
├── src/
│   ├── components/          # Page sections & composite components
│   │   └── ui/              # Reusable UI primitives (tabs, gallery, button, marquee)
│   ├── data/                # Static data models (rooms, product slots)
│   ├── hooks/               # Custom React hooks
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
