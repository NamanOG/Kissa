# Privacy

Kissa is a desktop application that runs on your own PC. It has no accounts, no analytics, no advertising and no telemetry. Nothing about you or your listening is sent to the developer.

## What stays on your PC

- Your settings, your record shelf (listening history), lyric timing adjustments, a cache of lyrics already found, and your Study Room sessions (intentions, steps, notes and times) are stored locally in your Windows user profile.
- Chosen lyric matches and imported LRC text are remembered locally for that recording. Imported files are not uploaded. Use **Lyrics options > Use automatic lyrics** to remove a saved choice for the current recording.
- Kissa reads what is currently playing from the Windows System Media Transport Controls (title, artist, album, artwork, playback position). That information is used to draw the turntable and is not uploaded anywhere.

## What Kissa requests from other services

To show lyrics and cover artwork, Kissa looks them up from public services. These requests contain the **title, artist and album of the track that is playing**, and nothing that identifies you beyond what any web request reveals (your IP address).

| Service | Why | What is sent |
| :--- | :--- | :--- |
| [LRCLIB](https://lrclib.net) | Synced lyrics and alternate matches | Track title and artist, with album and duration where known; a search you enter and the ID of a match you choose |
| iTunes Search API (Apple) | Cover artwork and track matching | A search term built from title and artist |
| Deezer API | Cover artwork, as a fallback | A search term built from title and artist |
| GitHub | Checking for and downloading updates | A request for the latest Kissa release |

Each of those services handles requests under its own privacy policy.

## Sharing on Discord (off unless you turn it on)

Kissa can show the track you are playing on your Discord profile. It is off by default, and Kissa asks before turning it on. When it is on, Kissa talks only to the Discord app running on your own PC, which publishes the activity to your profile: the track title, artist, album, a public cover image Kissa matched to the album, the time played, and a link to Kissa's Store page. Your friends and people in servers you share can see it, under Discord's own privacy policy. Apple Music is shared when this is on; Spotify is shared only if you also turn on **Also share Spotify**. While a Study Room session runs, the profile instead shows the room, the session's timer and how many of your steps are done, never what you are working on or the steps themselves; turn off **Show study sessions** to keep sessions off Discord. Turning sharing off clears the activity at once.

## Links you open yourself

The share feature can open a track in Spotify, Apple Music, TIDAL or YouTube. Those links open in your browser only when you choose them.

Study sitting cards are rendered on your PC and saved or copied only when you choose. They include the room, focus minutes, step counts and the record on the turntable at the finish. They leave out your intention, step text, notes and reflection. Kissa does not post these cards anywhere.

## The website

The Kissa website sets no cookies. It counts page visits with Vercel Web Analytics, which is cookieless and records pages viewed, referrer, browser, operating system, device type and country, without identifying individual visitors. It asks GitHub's public API for the latest release so the download button is current, and loads its typefaces from Google Fonts (the app itself carries its own fonts and contacts no font server). It remembers the latest release number in your browser's local storage for a few minutes to avoid repeating that request.

## Changes and contact

If Kissa's behaviour changes, this file changes with it; the history is public in this repository. Questions: open an issue at <https://github.com/NamanOG/Kissa/issues>.
