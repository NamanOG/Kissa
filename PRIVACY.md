# Privacy

Kissa is a desktop application that runs on your own PC. It has no accounts, no analytics, no advertising and no telemetry. Nothing about you or your listening is sent to the developer.

## What stays on your PC

- Your settings, your record shelf (listening history) and any lyric timing adjustments are stored locally in your Windows user profile.
- Kissa reads what is currently playing from the Windows System Media Transport Controls (title, artist, album, artwork, playback position). That information is used to draw the turntable and is not uploaded anywhere.

## What Kissa requests from other services

To show lyrics and cover artwork, Kissa looks them up from public services. These requests contain the **title, artist and album of the track that is playing**, and nothing that identifies you beyond what any web request reveals (your IP address).

| Service | Why | What is sent |
| :--- | :--- | :--- |
| [LRCLIB](https://lrclib.net) | Synced lyrics | Track title and artist, with album and duration where known |
| iTunes Search API (Apple) | Cover artwork and track matching | A search term built from title and artist |
| Deezer API | Cover artwork, as a fallback | A search term built from title and artist |
| GitHub | Checking for and downloading updates | A request for the latest Kissa release |

Each of those services handles requests under its own privacy policy.

## Links you open yourself

The share feature can open a track in Spotify, Apple Music, TIDAL or YouTube. Those links open in your browser only when you choose them.

## The website

The Kissa website sets no cookies and runs no analytics. It asks GitHub's public API for the latest release so the download button is current, and loads its typefaces from Google Fonts (the app itself carries its own fonts and contacts no font server). It remembers the latest release number in your browser's local storage for a few minutes to avoid repeating that request.

## Changes and contact

If Kissa's behaviour changes, this file changes with it; the history is public in this repository. Questions: open an issue at <https://github.com/NamanOG/Kissa/issues>.
