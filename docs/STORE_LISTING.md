# Microsoft Store listing — ready-to-paste text

Everything Partner Center asks for when you submit Kissa. The packaging side is in `MICROSOFT_STORE.md`.

## Product setup

| Field | Value |
| :--- | :--- |
| Product name | Kissa |
| Publisher display name | GlyphCode |
| Category | Music |
| Pricing | Free |
| Markets | All |
| Privacy policy URL | `https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md` |
| Website | The Kissa site, once it is live |
| Support contact | `https://github.com/NamanOG/Kissa/issues` |

## Short description (shown under the name)

> A vinyl player for Windows. Whatever you're already playing becomes a record turning on a desktop turntable.

## Description

> Kissa turns the music you're already playing into a record on a turntable.
>
> It doesn't replace your music app. Play something in Spotify, Apple Music, TIDAL, a local player or your browser, and Kissa picks it up through Windows: the cover lands on the label, the platter spins up, and the tonearm tracks the song. There is nothing to connect and no account to sign in to.
>
> THE DECK
> A turntable with real platter inertia at 33⅓ or 45 RPM. Drag the tonearm across the record to move through the track.
>
> LYRICS, IN TIME
> Synced lyrics that follow the music line by line, and word by word where available. Click a line to jump to that moment.
>
> EIGHT LISTENING ROOMS
> Warm Walnut Studio, Indigo Jazz Club, Petrichor, Sunday Morning and more. Each room re-lights the deck. Match Album draws the room's light from the colours of the current cover.
>
> A ROOM OF ITS OWN
> A fullscreen Listening Display, shown as a turntable or as a 12-inch cover on a stand, and an optional Windows screensaver that keeps the record turning when your desk goes quiet.
>
> YOUR RECORD SHELF
> The albums you listen to are kept as a crate of sleeves to flip through.
>
> No ads, no accounts, no telemetry. Kissa is free.
>
> Named after the jazz kissa, the Japanese listening cafés where you sit with a record and simply listen.

## What's new in this version (4.2.0)

> First release on the Microsoft Store. Lyrics now stay in time with the music, the app is lighter and a much smaller download, and you can make it yours: pick the colour of the record, add your name, and set the lyrics' size and typeface. Adds Start with Windows and Keep Running in Tray switches.

## Product features (one per line, up to 20)

- Follows Spotify, Apple Music, TIDAL, local players and browsers through Windows
- Turntable with real platter inertia at 33⅓ and 45 RPM
- Drag the tonearm to seek
- Synced lyrics, line by line and word by word
- Click a lyric to jump to it
- Eight listening rooms
- Match Album lighting from the current cover
- Fullscreen Listening Display
- Optional Windows screensaver
- Record Shelf of your listening history
- Mini Player
- Coloured vinyl pressings and lyric type options
- No ads, accounts or telemetry

## Search terms (up to 7)

`vinyl player`, `turntable`, `music player`, `lyrics`, `spotify companion`, `now playing`, `screensaver`

## Screenshots

The Store needs at least one, 1366×768 or larger, PNG. Use the room and mode stills from `apps/website/captures/` once recorded; until then the three PNGs in `apps/website/public/product/` (main window, fullscreen, fullscreen with lyrics) will do. Lead with the main window, then lyrics, a room, the fullscreen display and the shelf. Add a short caption to each.

Store logo images are generated into the package from `apps/desktop/build/icon.png`. Partner Center also accepts a 1:1 box art (1080×1080) and a 2:3 poster (720×1080) for the listing; both are optional.

## Age rating questionnaire

Kissa has no user-generated content, no communication between users, no purchases, no location or personal data collection, and no violent, sexual or gambling content of its own. It displays the artwork, titles and lyrics of whatever the user chooses to play, which may include explicit lyrics supplied by a third-party lyrics service — answer the questions about third-party or unrestricted content accordingly.

## Submission options

**Restricted capabilities → `unvirtualizedResources`.** Paste the justification from `MICROSOFT_STORE.md` ("The one thing that needs Microsoft's approval").

**Notes for certification** (helps the tester, who will not know the app needs music playing):

> Kissa displays music that is playing in another app. To test: start playback in any media app or a browser (for example a YouTube video), then open Kissa — the record starts turning and shows that track. With nothing playing, Kissa shows an idle "Listening Room" record.
>
> Settings (the gear icon) contains: "Set as Windows Screensaver", which writes HKCU\Control Panel\Desktop\SCRNSAVE.EXE (the reason for the unvirtualizedResources capability); and "Start with Windows", which uses the package's StartupTask. Kissa does not update itself; updates come through the Store.
>
> Lyrics are fetched from lrclib.net and cover artwork from the iTunes and Deezer search APIs, using the title and artist of the current track. No account or sign-in is needed.

## Before you press Submit

- [ ] `identityName`, `publisher` and `publisherDisplayName` in `apps/desktop/electron-builder.yml` match Partner Center exactly
- [ ] `npm run build:store` run *after* that change; upload `dist/Kissa-Store-4.2.0.appx`
- [ ] `LICENSE` and `PRIVACY.md` are pushed, so the privacy URL resolves
- [ ] Screenshots uploaded with captions
- [ ] Restricted-capability justification and certification notes pasted
