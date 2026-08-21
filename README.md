<p align="center">
  <img src="./apps/desktop/resources/phono_logo.png" width="140" height="140" alt="Kissa Logo" style="border-radius: 50%;" />
</p>

<h1 align="center">Kissa</h1>

<p align="center">
  <strong>A cinematic desktop music player built around the feeling of listening to a record.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-3.0.0-blue?style=flat-square" alt="Version 3.0.0" />
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

Named after Japan’s iconic *Jazz Kissa* (ジャズ喫茶) listening bars, **Kissa** brings the intimate, tactile ritual of analog vinyl and contemplative room atmospheres to modern desktop audio. 

Whether playing local high-resolution audio or synchronizing in real time with Windows System Media Transport Controls (Spotify, Apple Music, Tidal, web browsers), Kissa renders an animated turntable, precision tonearm tracking, and synchronized lyrics overlay in a calm, hardware-inspired listening space.

---

## 💾 Download & Installation

Get the latest release for **Windows 10 / 11** from the [**Releases Page**](https://github.com/NamanOG/Kissa/releases/latest):

- **`Kissa-Setup-x.x.x.exe`**: Standard installer with desktop shortcut and start menu integration.
- **`Kissa-Portable-x.x.x.exe`**: Standalone executable requiring no installation.

> **Note on Windows SmartScreen**: As an indie open-source release, Kissa's installer is currently unsigned. If you see a "Windows protected your PC" prompt, click **More info** &rarr; **Run anyway**.

---

## ✨ Features

### 🎧 High-Performance Playback Architecture
- **Unified `PlaybackClock`**: A single authoritative time source across audio engines, UI scrubbers, tonearm tracking, and lyrics.
- **Zero-Stutter Playback**: Playback timing is isolated from React rerenders, eliminating main-thread stalls and audio stutter.
- **High-Framerate Rendering**: Compositor-driven animations deliver smooth 60 FPS (and 120 FPS capable) visual feedback.

### 💿 Physical Vinyl & Tonearm Simulation
- **Machined Aluminum Turntable**: Plinth chassis with realistic slipmat texture, rotational inertia, and speed selection (33⅓ & 45 RPM).
- **Tactile Tonearm Interaction**: Drag and drop the precision tonearm to drop the needle and seek directly across record grooves.
- **Continuous Rotational Phase**: Turntable rotation angle persists across view changes without resetting or jumping.

### 🎶 Apple Music-Grade Synced Lyrics
- **Accurate Timing & Auto-Scroll**: Real-time synchronized lyrics via LRCLIB with spring-centered active line auto-scrolling.
- **Click-to-Seek Navigation**: Click any lyric line to jump the needle and playback directly to that timestamp.
- **Dynamic Optical Depth**: Smooth blur falloff on inactive lines with ambient lighting reflections.

### 📻 Queue & Continuous Listening
- **Interactive Queue**: Drag-and-drop reordering, quick track removal, and instant track jumping.
- **Seamless Auto-Advance**: Continuous playback with smooth vinyl lead-in/lead-out transitions between tracks.

### 🖥️ Dedicated Mini Player Mode
- **Compact Floating Widget**: Native Electron window resize down to a minimal, always-on-top desk companion.
- **Full Playback Control**: Transport controls, scrubber, track info, and mini turntable interface in a compact footprint.

### 🎨 8 Distinct Listening Environments
Atmospheric material themes that dynamically transform background depth, surface textures, typography contrast, and accent glows:
1. `01 — Quiet Listening Room` (*Walnut, warm paper, late-night lamp glow*)
2. `02 — Dusty Record Store` (*Faded sleeves, cardboard, muted olive*)
3. `03 — Japanese Jazz Bar` (*Charcoal, indigo, warm wood, dim light*)
4. `04 — Midnight Apartment` (*Smoky blue, graphite, midnight quiet*)
5. `05 — Rainy Window` (*Grey skies, soft reflections, warm indoor light*)
6. `06 — Hi-Fi Library` (*Dark wood, parchment, aged brass*)
7. `07 — Concrete & Vinyl` (*Soft concrete, terracotta, matte black*)
8. `08 — Sunday Morning` (*Warm linen, pale wood, faded sage*)

### 🎛️ Hardware-Inspired Controls & Visualizer
- **Mechanical Deck Switchgear**: Tactile toggles for Power, Speed, and Start/Stop with glowing indicator LEDs.
- **Subtle Hi-Fi Visualizer**: Low-overhead Canvas-based organic audio visualizer tuned for ambient listening.
- **Keyboard Shortcuts**: Full keyboard control for transport, volume, seeking, queue, and lyrics navigation.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Runtime** | Electron 39 | Frameless Windows desktop shell with native IPC and window management |
| **Build System** | `electron-vite` / Vite 7 | Fast module bundling and optimized multi-target compilation |
| **Frontend Core** | React 19 + TypeScript | Component architecture in strict TypeScript mode |
| **Animation & Graphics** | Web Animations API + Canvas API | Zero-React-overhead vinyl rotation and audio visualizer rendering |
| **Transitions** | Framer Motion 12 | Smooth UI view transitions and layout reordering |
| **State Management** | Zustand 5 | Minimalist store for application state and preferences |
| **Styling** | TailwindCSS v3 + CSS Variables | Dynamic theme-variable design system with tactile physical materials |
| **Windows Media** | `@coooookies/windows-smtc-monitor` | Real-time native Windows System Media Transport Controls synchronization |
| **Lyrics Service** | LRCLIB Integration | Real-time synchronized lyrics fetching and timing parsing |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **OS**: Windows 10 or 11 (for native SMTC media detection and Windows integration)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/NamanOG/Kissa.git
cd Kissa

# Install dependencies
npm install

# Start in development mode with HMR
npm run dev
```

### Building & Packaging

```bash
# Build desktop binaries for Windows (Installer & Portable)
npm run build:win --workspace apps-desktop

# Create unpacked directory build for fast local testing
npm run build:unpack --workspace apps-desktop
```

### Quality & Testing

```bash
# Run unit & integration tests (Vitest)
npm run test

# Run TypeScript typecheck
npm run typecheck

# Run linter (ESLint)
npm run lint
```

---

## 🗺️ Roadmap

### 🪟 Deeper Windows Integration
- Richer Windows media controls and lock-screen media surface support
- Global media-key binding refinement and background playback polish
- System tray minimization and Windows toast notifications

### 🌌 Ambient Desktop *(Experimental / Future)*
- Exploration of an ambient desktop / live wallpaper mode matching the current room atmosphere and vinyl rotation.

### 🎨 Additional Listening Environments
- New curated environments with custom acoustic textures and distinctive physical finishes.

### 🎛️ Further Hardware Interactions
- Enhanced tonearm inertia physics, needle surface noise simulation, and tactile physical feedback.

### 📊 Listening Insights
- Local, private listening statistics, session tracking, and listening pattern insights.

### 🔧 Quality & Accessibility
- Comprehensive keyboard navigation, screen-reader support, and reduced-motion display preferences.

> **Note on Streaming Services**: Kissa does not plan native closed-API streaming client integrations (such as Spotify or Apple Music OAuth/DRM playback) due to platform and licensing limitations. Kissa remains focused on local playback and seamless Windows System Media (SMTC) synchronization.

---

## 📜 Version History

- **`v3.0.0`**: Major performance, architecture, product, and visual refinement. Unified `PlaybackClock`, WAAPI vinyl rotation, dedicated Mini Player, queue management, distinct dynamic themes, and hardware-inspired settings.
- **`v1.0.0`**: Initial release featuring 3D turntable, basic SMTC tracking, synchronized lyrics, and room atmospheres.

---

## 📄 License

MIT © [NamanOG](https://github.com/NamanOG)
