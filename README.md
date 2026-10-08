<p align="center">
  <img src="./apps/desktop/resources/kissa_logo.png" width="140" height="140" alt="Kissa Logo" style="border-radius: 50%;" />
</p>

<h1 align="center">Kissa</h1>

<p align="center">
  <strong>A contemplative desktop vinyl player and listening companion for Windows.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-4.2.0-blue?style=flat-square" alt="Version 4.2.0" />
  <img src="https://img.shields.io/badge/Electron-39-blue?style=flat-square&logo=electron" alt="Electron 39" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-Free%20to%20use-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="https://apps.microsoft.com/detail/9p3n4x4wm80j">
    <img src="https://img.shields.io/badge/Get%20it%20from-Microsoft%20Store-0078d4?style=for-the-badge&logo=windows&logoColor=white" alt="Get Kissa from the Microsoft Store" />
  </a>
</p>

---

Kissa is a desktop music player and companion inspired by Japan's iconic *Jazz Kissa* (ジャズ喫茶) — intimate spaces built around attentive listening, analog warmth, and atmosphere.

Rather than competing with your music library or acting as another web streaming wrapper, Kissa turns your Windows desktop into a quiet listening space. It centers your listening around a physical turntable, an archival record shelf, ambient lighting environments, synchronized lyrics, and tactile hardware-inspired controls.

Kissa connects directly to active Windows System Media Transport Controls (SMTC) sessions. Whether you are playing through Spotify, Apple Music, Tidal, or a supported web browser, Kissa follows the session, rendering artwork, synchronized lyrics, and turntable motion in real time.

> **The music plays. The room responds.**

---

## Download & Installation

Kissa is free on the [**Microsoft Store**](https://apps.microsoft.com/detail/9p3n4x4wm80j) for **Windows 10 and Windows 11 (64-bit)**. The Store installs it and keeps it up to date.

---

## Core Features

### Physical Turntable

- Machined, hardware-inspired turntable assembly with realistic depth and lighting
- Animated vinyl rotation at 33 ⅓ RPM and 45 RPM speeds
- Rotational phase preservation across pause and track changes
- Physical tonearm placement and needle-drop response
- Real-time tonearm seeking across the record groove
- Tactile rotary dials and hardware switches for speed and power

### Windows System Media Integration

- Native Windows System Media Transport Controls (SMTC) synchronization
- Automatic session detection for Spotify, Apple Music, Tidal, and Chromium-based browsers
- Bidirectional transport controls: Play, Pause, Previous, Next
- External media seeking through SMTC (`TryChangePlaybackPositionAsync`) where supported by the source player
- Accurate UTF-8 metadata synchronization for international titles and artist names
- Reconciled playback clock compensating for external media state drift
- System tray background operation with quick playback access

### Synchronized Lyrics

- Real-time lyric synchronization powered by LRCLIB
- Word-level karaoke progression where source LRC data permits
- Dedicated instrumental break indicators and countdowns
- Manual lyrics timing offset calibration (-5.0s to +5.0s) with persistent per-track recall
- Interactive click-to-seek directly from lyric lines
- Optical depth hierarchy between past, active, and upcoming lines
- Automatic, smooth scrolling with manual scroll lock recovery

### Listening Environments & Match Album

- Eight curated listening environments:
  1. **Quiet Listening Room** — Walnut, warm paper, and late-night lamp glow
  2. **Dusty Record Store** — Faded sleeves, cardboard, and muted olive
  3. **Japanese Jazz Bar** — Charcoal, indigo, warm wood, and dim light
  4. **Midnight Apartment** — Smoky blue, graphite, and midnight quiet
  5. **Rainy Window** — Slate grey, soft reflections, and indoor warmth
  6. **Hi-Fi Library** — Dark mahogany, parchment, and aged brass
  7. **Concrete & Vinyl** — Architectural concrete, terracotta, and matte black
  8. **Sunday Morning** — Pale birch, warm linen, and faded sage
- **Match Album:** Dynamic ambient illumination driven by dominant and accent colors extracted from the current album art

### Listening Display & Native Screensaver

- **Manual Listening Display:** Immersive, full-screen listening mode switchable between a 12" album cover stand and turntable presentation
- **Native Windows Screensaver (`Kissa.scr`):** Full-fidelity screensaver that activates during Windows idle periods
- **Safe HKCU Registration:** Optional user-activated screensaver registration that only sets `SCRNSAVE.EXE` without modifying system timeout policies
- **Windows Screensaver Settings Shortcut:** Direct button in Kissa Settings to launch the native Windows Screen Saver control panel (`control.exe desk.cpl,,@screensaver`)
- **Clean Wake Detection:** Seamlessly resumes your desktop on mouse movement, keyboard input, or touch without leaving orphaned processes

### Record Shelf & Crate Browsing

- Archival catalog presentation for your music history
- Stable grid layout with detailed record spine and sleeve aesthetics
- Sorting by Recently Played, Recently Added, Play Count, and Alphabetical
- Album inspection drawer with full track listings and metadata
- Source-aware track sharing modal supporting direct links for Spotify, Apple Music, Tidal, YouTube, or clean text citations

### Startup Experience & Interactive Setup

- Restrained, cinematic startup screen with animated vinyl transitions
- Interactive first-run setup modal allowing users to configure preferred RPM, environment, and display preferences
- Settings persistence backed by local storage and Zustand state management

### In-App Update System

- **User-Controlled Lifecycle:** In-app update checking, streaming download with live transfer progress, and explicit confirmation before installation
- **Installed NSIS Workflow:** Downloads the installer securely into your local update cache, confirms readiness, cleanly quits active playback processes, and hands off to the NSIS installer
- **Portable Build Awareness:** Respects running portable executables by downloading the updated portable `.exe` to your Downloads directory and providing a direct "Show in Folder" action—never attempting unsafe in-place file replacement
- **Screensaver Guard:** Update checks, downloads, and restarts are strictly suppressed while Kissa is running in Windows screensaver mode (`--screensaver`)
  
---

## Windows Screensaver Architecture

Kissa includes a dedicated Windows screensaver implementation that renders the full-fidelity **Listening Display** when invoked by Windows.

### How It Works

1. **Supervisor (`Kissa.scr`):** A lightweight C# .NET 8 native Windows executable that receives Windows screensaver arguments (`/s`, `/c`, `/p`). On `/s`, it spawns `Kissa.exe --screensaver` and waits for the child process to terminate.
2. **Renderer (`Kissa.exe --screensaver`):** Electron initializes directly into the `ListeningDisplay` component with user chrome stripped. Audio hooks listen for wake input (mouse movement exceeding threshold, key press, or click) and exit cleanly.
3. **Safe Registry Management:** Screensaver registration is strictly opt-in via **Settings → Windows Screensaver**:
   - Updates `HKCU\Control Panel\Desktop\SCRNSAVE.EXE`.
   - Never alters system timeout (`ScreenSaveTimeOut`) or global screensaver activation state (`ScreenSaveActive`).
   - Conditional unregister only removes the value if it currently points to `Kissa.scr`, leaving other screensavers untouched.
   - Built-in "Open Windows Screensaver Settings" button launches `control.exe desk.cpl,,@screensaver` to let users adjust Windows idle timeout natively.

---

## Usage Guide

### Getting Started

1. Launch Kissa. If you are launching for the first time, the onboarding dialog lets you choose your default turntable speed and listening environment.
2. Open your preferred music player (Spotify, Apple Music, Tidal, or browser). Start playing a song.
3. Kissa detects the active Windows media session within seconds, displaying the album artwork, track details, and starting vinyl rotation.

### Turntable Controls

- **Power Switch:** Toggle turntable motor on or off.
- **33 ⅓ / 45 RPM Switch:** Switch rotational velocity.
- **Tonearm:** Click and drag the tonearm across the record surface to seek through the active track (supported players).
- **Transport Controls:** Use the bottom dock for Play/Pause, Next, Previous, and volume adjustments.

### Listening Display & Screensaver

- Press the **Display** button in the dock (or press `F11`) to enter the manual Listening Display. Press `Esc` or move your mouse to exit.
- Toggle between **Turntable Mode** and **Album Art Mode** using the top display selector.
- To use Kissa as your automatic screensaver, open **Settings (gear icon) → Windows Screensaver → Set as Windows Screensaver**, then click **Open Windows Screensaver Settings** to configure your preferred idle timeout in Windows.

### Synchronized Lyrics

- Click the **Lyrics** button in the dock or press `L` to toggle the lyrics drawer.
- If lyrics appear slightly ahead of or behind external audio, use the `+` / `-` offset buttons in the lyrics panel to calibrate timing in 250ms increments.

### In-App Updates

- Open **Settings (gear icon) → Application → Check for Updates** (or right-click the system tray icon and select **Check for Updates...**).
- If a new version is available, Kissa displays the release version and a **Download Update** button.
- Click **Download Update** to stream the release binary directly within the app. A real-time progress bar reports transfer percentage, download speed, and transferred megabytes, with a **Cancel** button if you wish to abort.
- **Installed Version:** Once the download completes, click **Restart & Install**. Kissa prompts for confirmation (*"Restart Kissa now to apply update? Active playback will stop."*) before closing cleanly and handing off to the NSIS installer.
- **Portable Version:** Kissa downloads the new portable executable to your Windows Downloads folder and presents a **Show in Folder** button so you can launch the updated binary at your convenience without risking in-place executable corruption.
- **Safe Fallbacks:** If a download is interrupted or encounters network errors, click **Try Again** or use **View Release** to view release notes directly on GitHub.
- **Screensaver Guard:** Update checks and installation handoffs are strictly suppressed while Kissa is running in native screensaver mode (`--screensaver`).

---

## Technical Architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Desktop Shell** | Electron 39 | Windows desktop lifecycle, native window management, multi-process IPC |
| **Build Tooling** | `electron-vite` / Vite 7 | Fast development HMR and production bundling |
| **User Interface** | React 19 + TypeScript | UI component architecture and strict type safety |
| **Native SMTC Helper** | C# .NET 8 (`smtc-helper.exe`) | WinRT `Windows.Media.Control` integration for external media discovery and seeking |
| **Screensaver Supervisor** | C# .NET 8 (`Kissa.scr`) | Native Windows screensaver protocol bridge (`/s`, `/c`, `/p`) |
| **State Management** | Zustand 5 | Application state, player store, and user preferences |
| **Styling** | TailwindCSS v3 + CSS Variables | Hardware design system, typography tokens, and atmospheric themes |
| **Motion & Animation** | Web Animations API + Framer Motion 12 | Smooth 60 FPS vinyl rotation, tonearm physics, and UI transitions |
| **Lyrics Engine** | LRCLIB API | Synchronized timestamped lyric retrieval |
| **Packaging** | `electron-builder` + NSIS | Windows installer and portable binary generation |

---

## Known Limitations

- **External Application SMTC Support:** Kissa relies on the active media player's implementation of Windows SMTC. While playback status and track metadata work consistently across Spotify, Apple Music, and Chromium browsers, some desktop media applications do not report playback timeline positions or implement seek commands.
- **Seeking Capabilities:** Seeking via tonearm or progress scrub bar depends on whether the source application implements `TryChangePlaybackPositionAsync`. Spotify Desktop and modern browsers support this; certain legacy players do not.
- **Platform Scope:** Kissa is engineered exclusively for Windows 10 and Windows 11 to take full advantage of native Windows Media Control APIs and `.scr` screensaver protocols.
- **Windows Idle Timeout:** Kissa cannot and does not programmatically override your Windows global screensaver timeout. Windows controls when screensavers activate based on the duration configured in Windows Screen Saver Settings.
- **Lyrics Availability:** Synchronized lyrics are sourced from the public LRCLIB database. Rarely played tracks, instrumental compositions, or local un-tagged files may not have synchronized lyrics available.

---

## Development & Building

### Prerequisites

- Windows 10 or Windows 11 (64-bit)
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- .NET 8 SDK (required to compile `smtc-helper` and `KissaScreensaver`)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/NamanOG/Kissa.git
cd Kissa

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Verification Commands

```bash
# Type checking
npm run typecheck

# Code linting
npm run lint

# Automated test suite
npm run test

# Build native SMTC helper
npm run build:smtc

# Build native Windows screensaver
npm run build:screensaver

# Build unpacked Windows distribution
npm run build:unpack
```

### Production Build

```bash
# Package production installer and portable binary
npm run build:win
```

Production artifacts are output to `apps/desktop/dist/`:

- `Kissa-Setup-4.2.0.exe`
- `Kissa-Portable-4.2.0.exe`

---

## Version History

### v4.2.0 — The Front Door

- **Microsoft Store Build:** Kissa can now be packaged for the Microsoft Store (`npm run build:store`) alongside the existing installer and portable builds. The Store build registers its screensaver from a stable per-app location, starts at sign-in through a Windows startup task, and leaves updates to the Store.
- **Start with Windows & Keep Running in Tray:** Both preferences now have switches in Settings. They were stored and honoured before, but nothing exposed them.
- **Far Smaller Download:** The app archive no longer ships .NET build output or build-only tooling, cutting it from about 546 MB to about 16 MB.
- **Honest Record Shelf:** The idle "Kissa — Listening Room" placeholder is no longer saved as an album, and is removed from existing shelves.
- **Lyrics When Idle:** With nothing playing, the lyrics view shows "Waiting for Music" instead of searching for lyrics to the placeholder.
- **Lyrics That Stay in Time:** The clock the lyrics follow was being rounded to the nearest second once a second, leaving them up to half a second out for a whole track. It now runs free between reports from the music app and eases out drift. Word-by-word highlighting was also reading the wrong word's timing; that is fixed.
- **The Right Lyrics for the Recording:** Timed lyrics are only used when they belong to the same cut of the song. When only another version's lyrics exist, the words are shown without timing instead of drifting. Results for a different song are ignored.
- **Lighter on the Machine:** The media helper sent the full album cover five times a second. It now sends the cover once and a small heartbeat after that, and the lyrics view no longer redraws every line on every line change.
- **Make It Yours:** Choose the colour of the record (seven pressings), tell Kissa your name for a greeting and your shelf's title, and set the lyrics' size and typeface.
- **Tidier Deck and Settings:** The deck shows the album, and no longer repeats the time three times. Settings are split into Room, Playback and System. Timing can be nudged from the lyrics view itself.
- **Works Offline:** Every typeface now ships inside the app; nothing is fetched from a font server.
- **Adaptive Atmosphere Tile:** The ninth atmosphere has its own artwork instead of repeating the Warm Walnut Studio photograph.
- **Minimum Window Size:** Raised to 900 × 640, the smallest size at which the deck layout fits without overlap.
- **Licence & Privacy:** Kissa stays free to use, and from this version the source is published for reading rather than reuse (see `LICENSE`). Added `PRIVACY.md`.

### v4.1.0 — The Deliberate Listening Update

- **External SMTC Seeking:** Real-time bidirectional seeking through Windows System Media Transport Controls via `TryChangePlaybackPositionAsync` with optimistic clock settlement.
- **Native Windows Screensaver:** Bundled `Kissa.scr` supervisor with safe HKCU user registration and unregistration.
- **Listening Display Refinement:** Expanded 12" album cover stand with centered typography, atmospheric lighting, and seamless manual/screensaver transitions.
- **Windows Screensaver Settings Shortcut:** Direct button in application settings to open Windows Screen Saver control panel (`control.exe desk.cpl,,@screensaver`).
- **Synchronized Lyrics Improvements:** Instrumental break countdowns, fine-grained offset adjustment (-5.0s to +5.0s), and click-to-seek navigation.
- **Source-Aware Track Sharing:** Contextual modal generating direct links for Spotify, Apple Music, Tidal, and YouTube.
- **Hardware Setup Onboarding:** Interactive first-run setup flow for initial turntable and room personalization.
- **In-App Update System:** Safe, user-controlled update checking, in-app streaming download with real-time transfer progress, cancellation support, confirmation dialogs, and clean installer handoff (with separate safe handling for portable builds).
- **Production Polish:** Clean production updater diagnostics gating, zero-warning Tailwind build, and complete test coverage across 38 suites.

### v4.0.0 — The Listening Machine

- Redesigned Listening Room and turntable interaction
- Archival Record Shelf with crate browsing
- Cinematic synchronized lyrics
- Refined Match Album environments
- Hardware-inspired controls
- System Media Transport Controls synchronization
- Mini Player companion

### v3.0.1 — The Room Responds

- Match Album adaptive atmosphere
- Artwork-driven ambient lighting
- Playback duration synchronization improvements
- Tonearm and lyric adjustments

### v3.0.0

- Unified playback architecture
- High-performance vinyl animation
- Dedicated Mini Player
- Listening environments

### v1.0.0

- Initial Kissa release featuring turntable interface, SMTC synchronization, and synchronized lyrics.

---

## License

Kissa is free to use. The source is published so you can see how it works; it is not open source and may not be copied or redistributed. See [LICENSE](LICENSE).

© 2026 Naman Bagdiya ([GlyphCode](https://www.glyphcode.studio/))

## Privacy

Kissa has no accounts, analytics or telemetry. It looks up lyrics and cover artwork from public services and checks GitHub for updates; [PRIVACY.md](PRIVACY.md) lists exactly what is sent.
