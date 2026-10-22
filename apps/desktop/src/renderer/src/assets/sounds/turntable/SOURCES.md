# Turntable sounds: sources

Softer set, 21 October 2026 (night). The needle comes from a Pixabay recording chosen by the
owner. The controls come from Freesound CC0 recordings, cut and gently rounded so the set sounds
like one quiet object. Licences were checked on each sound's page on 21 October 2026.

## Licences

- **Pixabay Content License** (needle drop and lift; the alternative drop candidate).
  - Allows free use, modification and commercial use, with no attribution required.
  - Forbids selling or distributing the content on a standalone basis.
  - Here it is cut, filtered and embedded as short events inside the app, not offered as a file.
  - The 62336 recording is shown on Pixabay as by TRP, imported from Freesound (uploader
    "freesound_community").
- **Creative Commons 0** (all controls). Public domain; no attribution is required. The sources
  are listed so each sound can be traced and replaced.

## Edits applied to every file

1. Decoded (Chromium), mixed to mono and resampled to 48 kHz.
2. DC offset removed.
3. Trimmed to the single event.
4. Faded in (raised-cosine, 3–12 ms) and out (smoothstep).
5. Filtered as noted (2nd-order filters).
6. Loudness-set: the loudest 50 ms after a 60 Hz high-pass, with peaks at or below -6 dBFS.
7. Saved as 16-bit 48 kHz mono WAV.

There are no pitch or time changes, and no music or speech in any source. The app plays every
file at 0.9 (MASTER_GAIN in `utils/deckSounds.ts`).

## Files

| File | Event | Source | Author | Cut (s) | Edits | Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| needle-drop.wav | Stylus touches (22 ms in), settles with two smaller bumps, then a short stretch of groove crackle that fades | [Record vinyl needle drop start scratches crackle (62336)](https://pixabay.com/sound-effects/film-special-effects-record-vinyl-needle-drop-start-scratches-crackle-62336/) | TRP via Pixabay | 0.41–1.28 | 35 Hz high-pass; fade-out over the last 0.45 s | -32 |
| needle-lift.wav | Stylus leaving the groove, from the same turntable as the drop | same as above | TRP via Pixabay | 2.92–3.10 | 40 Hz high-pass; 8 ms fade-in | -36 |
| start-stop.wav | Large key pressed: a rounded, slow-attack switch | [Reel to reel tape switch (796605)](https://freesound.org/s/796605/) | DSAron (AKAI 4000DS) | 0.82–0.98 | 60 Hz high-pass, 2.6 kHz low-pass | -39 |
| key-release.wav | The same switch returning, lighter | same as above | DSAron | 3.38–3.50 | 80 Hz high-pass, 2.2 kHz low-pass | -46 |
| match-album.wav | Soft square key | [Tape Deck Buttons and Switches (403247)](https://freesound.org/people/Nekkowe/sounds/403247/) | Nekkowe (Sony CFD-9) | 11.04–11.13 | 80 Hz high-pass, 2.4 kHz low-pass; a duller key than before | -42 |
| power.wav | Power switch | [RecordPlayer-Antique-Switches (139963)](https://freesound.org/people/jessepash/sounds/139963/) | jessepash | 5.14–5.27 | 60 Hz high-pass, 2.4 kHz low-pass | -38 |
| speed.wav | 33/45 key | same as above | jessepash | 2.191–2.29 | 60 Hz high-pass, 2.4 kHz low-pass; 5 ms fade-in | -41 |
| tick.wav | On-screen switches and sliders | same as above | jessepash | 2.192–2.222 | 80 Hz high-pass, 2.0 kHz low-pass | -51 |

## Not installed, kept for comparison

**Alternative needle drop, candidate B.** [Vinyl Needle Drop (572432)](https://pixabay.com/sound-effects/film-special-effects-vinyl-needle-drop-572432/) by u_xg7ssi08yr, Pixabay Content License.
- Cut 0.065–1.25, 35 Hz high-pass, 0.55 s fade-out, level -32.
- Shape: a light touch, then a heavier low settle about 0.27 s later, then platter rumble that fades.
- It is a preview only, not bundled.

**Replaced earlier on 21 October.**
- Breviceps' drop (Freesound 556722) and Stratocube's lift (456283).
- The brighter jessepash and Nekkowe cuts at higher levels: press -32, release -38, power -32, speed -35, match -34, tick -42.

**Auditioned by analysis earlier and not used.** srrecords' Technics 1200 drop (200259) and lift (200258), CC0.
