<p align="center">
  <img src="./apps/desktop/resources/phono_logo.png" width="160" height="160" alt="Kissa Logo" style="border-radius: 50%;" />
</p>

<h1 align="center">Kissa</h1>

<p align="center">
  <strong>A contemplative desktop vinyl player & listening environment for Windows.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-39-blue?style=flat-square&logo=electron" alt="Electron 39" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="https://github.com/NamanOG/Kissa/releases/latest">
    <img src="https://img.shields.io/badge/Download%20for%20Windows-.exe%20(Installer%20%26%20Portable)-0078d4?style=for-the-badge&logo=windows&logoColor=white" alt="Download Kissa for Windows" />
  </a>
</p>

Named after Japan’s iconic *Jazz Kissa* (ジャズ喫茶) listening bars, **Kissa** brings the intimate ritual of analog vinyl and room atmospheres to your desktop. It listens to Windows System Media Transport Controls (Spotify, Apple Music, Tidal, web browsers) in real time and renders an animated 3D turntable, precision tonearm, and synchronized lyrics overlay in a calm, distraction-free window.

---

## 💾 Download & Install

Get the latest version for **Windows 10 / 11** from the [**Releases Page**](https://github.com/NamanOG/Kissa/releases/latest):

- **`Kissa-Setup-x.x.x.exe`**: Full installer with desktop shortcut and start menu entry (featuring custom Japanese minimalist branding).
- **`Kissa-Portable-x.x.x.exe`**: Single standalone executable — run directly without installing.

> **Note on Windows SmartScreen**: As an indie open-source app, Kissa's installer is currently unsigned. You may see a blue "Windows protected your PC" warning. Simply click **More info** -> **Run anyway** to continue safely.

---

## Key Features

- **Automatic Update Checking**: Kissa automatically checks for new GitHub releases and elegantly notifies you in the Settings menu when a new version is ready, providing a direct download link.
- **3D Animated Turntable Plinth**: Physical turntable chassis with machined aluminum platter, felt slipmat, rubber isolation feet, and rotational inertia (33⅓ RPM and 45 RPM).
- **Precision Tonearm Mechanics**: Dieter Rams / Braun-inspired gimbal bearing pivot, knurled counterweight, and continuous needle tracking across record grooves with realistic needle lift/drop depth.
- **Apple Music-Grade Synced Lyrics**: Full LRC timing support with dynamic optical depth-of-field blur, smooth spring auto-centering, and interactive click-to-seek karaoke.
- **Native Windows SMTC Sync**: Zero-configuration real-time media tracking across Spotify, Apple Music, Chrome, Edge, and other desktop players.
- **8 Listening Environments (Room Atmospheres)**:
  - `01 — Quiet Listening Room` (*Walnut, warm paper, late-night lamp glow*)
  - `02 — Dusty Record Store` (*Faded sleeves, cardboard, muted olive*)
  - `03 — Japanese Jazz Bar` (*Charcoal, indigo, warm wood, dim light*)
  - `04 — Midnight Apartment` (*Smoky blue, graphite, midnight quiet*)
  - `05 — Rainy Window` (*Grey skies, soft reflections, warm indoor light*)
  - `06 — Hi-Fi Library` (*Dark wood, parchment, aged brass*)
  - `07 — Concrete & Vinyl` (*Soft concrete, terracotta, matte black*)
  - `08 — Sunday Morning` (*Warm linen, pale wood, faded sage*)
- **Interactive Controls**: Tactile rotary speed dial, power/pause plinth buttons, master volume slider, and dynamic audio equalizers.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Runtime** | Electron (Windows-first frameless window with Mica backdrop) |
| **Build System** | `electron-vite` |
| **UI Framework** | React 19 + TypeScript (Strict Mode) |
| **Styling** | TailwindCSS v3 + Custom Design Tokens |
| **Animation** | Framer Motion 12 + GPU CSS Transforms |
| **State** | Zustand 5 |
| **Media Detection** | `@coooookies/windows-smtc-monitor` |
| **Lyrics** | LRCLIB Client Integration |

---

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Windows 10/11 (for native SMTC media detection)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/NamanOG/Kissa.git
cd Kissa

# Install dependencies
npm install

# Start in development mode with HMR
npm run dev
```

### Build & Package

```bash
# Build desktop binary for Windows
npm run build:win --workspace apps-desktop
```

### Quality & Tests

```bash
# Run unit & integration tests (Vitest)
npm run test

# Run TypeScript typecheck
npm run typecheck

# Run linter (ESLint)
npm run lint
```

---

## License

MIT © [NamanOG](https://github.com/NamanOG)
