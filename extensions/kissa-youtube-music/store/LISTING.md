# Store listing: Kissa for YouTube Music

Copy for the Chrome Web Store and Microsoft Edge Add-ons. Fields are named as each dashboard
names them. Nothing here has been submitted.

## Basics

- **Name:** Kissa for YouTube Music
- **Summary / short description (≤132 characters):**
  Show what you play on YouTube Music in the Kissa app for Windows, and on Discord through Kissa. Reads nothing else.
- **Category:** Chrome: Entertainment (or "Fun"). Edge: Entertainment.
- **Language:** English
- **Website / homepage:** https://kissa.glyphcode.studio/
- **Support URL:** https://github.com/NamanOG/Kissa/issues
- **Privacy policy URL:** https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md (section "Kissa for YouTube Music"; push it first)
- **Price:** Free. No in-app purchases, no ads.

## Description

Kissa is a free vinyl player for Windows: whatever you play turns as a record on a desktop turntable, with synced lyrics and listening rooms. This small add-on lets Kissa follow YouTube Music in your browser.

Windows cannot tell which website a browser tab is playing, so without help Kissa cannot tell YouTube Music from any other video or tab. This add-on runs only on music.youtube.com and tells the Kissa app on the same PC what is playing: the song, artist, album and cover, and whether it is playing. Kissa then shows it on the turntable and, if you choose, on your Discord profile.

How to set it up:
1. Install Kissa from the Microsoft Store and open Settings → System → Share on Discord → Also share YouTube Music.
2. Add this add-on and click its icon.
3. Type the six-digit code Kissa shows. That is all.

Private by design:
- Runs only on music.youtube.com. Reads nothing on other sites.
- Talks only to the Kissa app on your own PC, never to a server. No analytics.
- Skips ads. Never touches your Google account, cookies, history or audio.
- Remove the pairing at any time from the add-on or from Kissa.

Requires the Kissa app for Windows (free, Microsoft Store).

## Single purpose (Chrome "Single purpose description")

Lets the Kissa desktop app on the user's own PC know what is playing on music.youtube.com, so Kissa can display it and, if the user enables it, share it on Discord.

## Permission justifications

- **storage:** Keeps the pairing token Kissa issues, the local connection port, and the latest connection result and its timestamp, so the add-on stays paired after the browser restarts and can show its connection status. These stay on the user's PC.
- **Host permission http://127.0.0.1:47321–47323/\*:** The only place the add-on sends data: the Kissa app's local link on the same computer. These loopback addresses are not reachable from the internet.
- **Content script on https://music.youtube.com/\*:** Reads the player's own media information (title, artist, album, cover address, play state, position) on YouTube Music only.
- **Remote code:** None. All code is in the package.

## Data usage disclosures (Chrome "Privacy practices" / Edge equivalent)

- Collects: **Website content**, meaning the song title, artist, album, cover address and playback state on music.youtube.com; **Authentication information**, limited to Kissa's local six-digit pairing code and pairing token, never Google or Discord credentials.
- Not collected: personally identifiable information, health, financial, personal communications, location, web history, user activity (clicks, keystrokes).
- Use: only to provide the add-on's single purpose. The data goes only to the Kissa app on the same PC.
- Certifications to tick: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

## Assets

- Store icon 128×128: `../icons/icon-128.png`
- Screenshots (1280×800): `screenshots/` (see `SCREENSHOTS.md` for what each shows)
- Small promo tile 440×280 (Chrome, optional): `screenshots/promo-440x280.png`
