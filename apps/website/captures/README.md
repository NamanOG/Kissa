# Capture guide for the Kissa website

Everything the website still needs from the real app: what to record, how, what to call it and where to put it.

**Drop raw files in this folder (`apps/website/captures/`).** It is git-ignored apart from this guide, so large recordings never get committed. They get compressed and copied into `public/media/` from here; you don't need to edit or convert anything yourself.

```text
apps/website/captures/
├── modes/      six short clips, one per mode
├── rooms/      one still per room (+ optional sweep clip)
├── demo/       the demo video and its poster frame
└── brand/      logo (SVG) and optional social card
```

The clips are used as **muted, looping, autoplaying video** — they behave like GIFs (no controls, no sound, loop forever) but are far sharper and a fraction of the size. Only the demo video is a normal player with controls.

---

## 1. Recording setup (OBS Studio)

OBS is the right tool. Set it up once, then every take matches.

**Settings → Video**

| Setting | Value |
| :--- | :--- |
| Base (Canvas) Resolution | 1920×1080 |
| Output (Scaled) Resolution | 1920×1080 |
| FPS | 60 |

**Settings → Output → Recording** (Output Mode: Advanced)

| Setting | Value |
| :--- | :--- |
| Recording Format | MKV (safe if OBS crashes; MP4 is fine too) |
| Video Encoder | NVIDIA NVENC H.264 (or x264 if unavailable) |
| Rate Control | CQP, level **16** (x264: CRF 16) |
| Preset | Quality / P6 |
| Audio | leave on for the demo; irrelevant for the clips |

**Source: Window Capture, not Display Capture**

1. Sources → **+** → **Window Capture** → pick the Kissa window.
2. Capture Method: **Windows 10 (1903 and up)**.
3. **Untick "Capture Cursor"** — this is what keeps the pointer (and any scrollbar or overlay from other windows) out of the recording. Tick it again only for the two takes where the cursor is the point: dragging the tonearm, and browsing the shelf.
4. Tick **Client Area** so the Windows title bar is left out.
5. Right-click the source → Transform → **Fit to screen** (Ctrl+F).

Window Capture records only Kissa, so nothing else on your desktop can leak in. For the fullscreen and screensaver modes, Window Capture still works; if a mode shows black, switch that take to **Display Capture** with "Capture Cursor" unticked.

**Before you hit record**

- Windows: turn on **Do not disturb** (no notification toasts).
- Close anything that draws an overlay (NVIDIA overlay, Discord, Xbox Game Bar).
- Keep the Kissa window the **same size for every take**. If your monitor is 1080p, maximised is fine; on a larger monitor, size the window to 1920×1080.
- Let the track play for a few seconds first so the platter is at speed and the artwork has loaded.
- Don't worry about clean start and end points. Record **15–20 seconds** per clip; the best 8–10 seconds get cut out afterwards.

**Stills:** in OBS, right-click the preview → **Screenshot (Source)**. That saves a lossless PNG at exactly 1920×1080 with no cursor.

---

## 2. Mode clips — `captures/modes/`

Six clips, 15–20 s each, 1920×1080, 60 fps. Sound doesn't matter (they play muted).

| File | Mode | What should happen in the take | Suggested track |
| :--- | :--- | :--- | :--- |
| `01-normal.mkv` | Normal Window | Record spinning. Halfway through, **drag the tonearm** to a new spot and let it settle (cursor on for this one). | Radiohead — *Weird Fishes / Arpeggi* (In Rainbows) |
| `02-fullscreen.mkv` | Fullscreen Room | Start in the normal window, enter fullscreen, hold on the lit turntable and clock. | Frank Ocean — *Pink + White* (Blonde) |
| `03-fullscreen-lyrics.mkv` | Fullscreen Lyrics | Three or four lines advancing, then **click a later line** so it jumps. | Cigarettes After Sex — *Apocalypse* |
| `04-screensaver.mkv` | Screensaver | The screensaver running, record turning, no interaction. | Kanye West — *Runaway* (the piano intro) |
| `05-screensaver-lyrics.mkv` | Screensaver Lyrics | Same, with lyrics flowing. | Radiohead — *Reckoner* (In Rainbows) |
| `06-shelf.mkv` | Record Shelf | Scroll or flip through the crate, hover a few sleeves, open one (cursor on). | — fill the shelf first, see below |

**For the shelf:** play a minute or so of 12–20 different albums beforehand so the crate is full and varied. Covers that look good together: Blonde, channel ORANGE, In Rainbows, Kid A, OK Computer, Graduation, 808s & Heartbreak, Late Registration, My Beautiful Dark Twisted Fantasy, After Hours, Starboy, Kiss Land, DAMN., To Pimp a Butterfly, Astroworld, Cigarettes After Sex.

**Lyrics on screen:** pick a passage with clean, short lines. A lot of Kanye, Kendrick and The Weeknd is explicit, which you probably don't want as the first thing on a product page.

---

## 3. Room stills — `captures/rooms/`

The point of these is to show **only the light changing**, so everything else must stay identical.

- One track, paused or at the **same playback position** in every shot, same window size, same view (normal window, deck visible).
- Use a cover that is close to black-and-white so the room's colour is what stands out: **Cigarettes After Sex — *Cigarettes After Sex*** works well.
- Lossless PNG via OBS "Screenshot (Source)".

| File | Room |
| :--- | :--- |
| `room-01.png` | Warm Walnut Studio |
| `room-02.png` | Vintage Amber |
| `room-03.png` | Indigo Jazz Club |
| `room-04.png` | Cold Midnight |
| `room-05.png` | Petrichor |
| `room-06.png` | Hi-Fi Library |
| `room-07.png` | Concrete Loft |
| `room-08.png` | Sunday Morning |
| `room-match-album.png` | Match Album on, with a colourful cover (channel ORANGE or Graduation) |

**Optional — `rooms-sweep.mkv`:** one 25–30 s clip where you switch through all eight rooms in order, pausing about 3 s on each. This would let the site show the app's real room transition.

**Optional, for variety — `captures/rooms/paired/`:** the same rooms with a cover chosen to suit each one. These are for social posts and the store listing more than the site.

| Room | Cover that suits it |
| :--- | :--- |
| Warm Walnut Studio | Frank Ocean — channel ORANGE |
| Vintage Amber | Kanye West — Late Registration |
| Indigo Jazz Club | Kanye West — Graduation |
| Cold Midnight | The Weeknd — Dawn FM, or Radiohead — Kid A |
| Petrichor | Radiohead — OK Computer |
| Hi-Fi Library | The Weeknd — Kiss Land |
| Concrete Loft | Kanye West — 808s & Heartbreak |
| Sunday Morning | Frank Ocean — Blonde |

---

## 4. Demo video — `captures/demo/`

| File | What |
| :--- | :--- |
| `demo.mkv` | **60–90 seconds**, 1920×1080, 60 fps. One continuous take if you can. |
| `demo-poster.png` | One clean, attractive frame (deck visible, artwork loaded). OBS "Screenshot (Source)". |

Suggested sequence, roughly 10–15 s each:

1. Kissa idle → press play in Spotify or Apple Music → the record spins up and the artwork lands on the label.
2. Drag the tonearm to seek.
3. Open lyrics; let a few lines pass; click a line.
4. Switch through two or three rooms.
5. Enter the fullscreen listening display.
6. End on the record shelf, or on the deck from above.

**Sound:** a product video with a commercial track as its soundtrack is the one place the music itself is being redistributed, and it is the part most likely to draw a takedown. Either record it **muted**, or use a track you have the rights to. The clips in section 2 are always muted, so this only applies here.

---

## 5. Brand — `captures/brand/`

| File | What |
| :--- | :--- |
| `kissa-logo.svg` | The mark as a vector. Used for the nav and favicon (the current PNG favicon is 351 KB). |
| `social-card.png` *(optional)* | 1200×630 card for link previews. The site currently uses a cropped screenshot (`public/og.jpg`). |

---

## 6. Optional replacements for the current mode stills

The six screenshots in use today are fine and will stay as the loading frame for each clip. Replace them only if you want different tracks showing. Same names as now, 1920×1080 PNG, placed in `apps/website/public/product/`:

`product-main-window.png`, `product-fullscreen.png`, `product-fullscreen-lyrics.png`, `product-screensaver.png`, `product-screensaver-lyrics.png`, `product-record-shelf.png`

---

## A note on album art and lyrics

Covers and lyric lines in screenshots are other people's copyrighted work. Showing a music app with real music in it is what nearly every such app does, and it is your call; the lower-risk choices are short clips rather than long ones, no commercial audio in the demo, and avoiding close-ups where a cover or a lyric is the whole image.
