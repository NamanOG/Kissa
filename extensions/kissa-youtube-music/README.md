# Kissa connector for YouTube Music (prototype)

Lets the Kissa desktop app show what plays on `music.youtube.com` in Discord. Windows cannot
tell YouTube Music apart from any other browser tab (every tab reports the same app id, and
ordinary YouTube and ads report as "Music"), so Kissa takes YouTube Music only from this
connector.

## What it does, and nothing more

- Runs only on `https://music.youtube.com/*`.
- Reads the page's own media metadata (title, artist, album, cover) and the `<video>`
  element's play/pause, position and duration. Skips ads.
- Sends that to the Kissa app on the same PC at `http://127.0.0.1` (ports 47321–47323), only
  after being paired with a six-digit code Kissa shows. No accounts, cookies, history, audio
  capture or cloud service.
- Permissions: `storage` (the pairing token) and host access to `http://127.0.0.1/*`.

## Try it (development only)

1. In Kissa: Settings → Discord → turn on sharing, then "Also share YouTube Music", then
   "Pair connector".
2. In Chrome or Edge: Extensions → Developer mode → Load unpacked → this folder.
3. Open the connector's popup, type the code, and play something on music.youtube.com.

## Status and limits

- **Prototype.** Not published to any extension store. Publishing needs the owner's
  developer account and a store review; until then it can only be loaded unpacked.
- Tested with Chromium 1217 (Playwright build) on Windows, 19 Oct 2026. Chrome removed
  `--load-extension` from branded builds, so automated tests use Chromium.
- It depends on YouTube Music's page (media metadata, the `#movie_player.ad-showing` class).
  If YouTube Music changes, the connector stops reporting and Kissa clears the track within
  15 seconds (fail closed); it never guesses.
