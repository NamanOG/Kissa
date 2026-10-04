# Publishing Kissa 4.2.0 — step by step

From the code on your machine to a live Microsoft Store listing. Do the parts in order.
Listing text to paste is in `STORE_LISTING.md`; how the Store build differs is in `MICROSOFT_STORE.md`.

Partner Center's pages change from time to time. Where a label below differs from what you see, look for the nearest equivalent; the sequence is the same.

---

## Part 1 — Check the build on your PC (about 20 minutes)

All commands run from `apps/desktop`.

1. Quit any running Kissa (tray icon → Quit), then remove the earlier test install:

   ```bash
   npm run test:store -- -Remove
   ```

2. Build and install the 4.2.0 test package:

   ```bash
   npm run build:store
   ```
   ```bash
   npm run store:layout
   ```
   ```bash
   npm run test:store
   ```

   The script should print PASS for every line and then open Kissa.

3. Play a song with lyrics in Spotify or Apple Music and check by hand:

   - [ ] The record spins, the cover and title appear.
   - [ ] **Lyrics view:** the highlighted word matches what is being sung. Pause and resume from Kissa and from the music app; seek; skip a track. The lyrics should follow each time.
   - [ ] If lyrics are consistently a little early or late for one song, hover the lyrics and use the − / + control at the bottom left. (If they are off for *every* song, tell me the app and by how much.)
   - [ ] Settings → Room: change the pressing colour; type your name; close Settings, stop the music and check the greeting.
   - [ ] Settings → Playback: lyrics size and typeface change the lyrics view.
   - [ ] Settings → System: Start with Windows, Keep Running in Tray, Set as Windows Screensaver, and "Version 4.2.0 · Updated by Microsoft Store".
   - [ ] Turn Wi-Fi off and restart Kissa: the fonts look the same as before.

4. Remove the test package again when you are done:

   ```bash
   npm run test:store -- -Remove
   ```

## Part 2 — Commit and push

From the repository root:

```bash
git add -A
```
```bash
git status
```

Read the list once. Nothing under `dist/`, `out/`, `node_modules/` or `apps/website/captures/` (except its README) should appear.

```bash
git commit -m "release: Kissa v4.2.0"
```
```bash
git push origin main
```

After the push, open `https://github.com/NamanOG/Kissa/blob/main/PRIVACY.md` in a browser. That address is the privacy policy link the Store asks for, so it has to load.

Do **not** push the `v4.2.0` tag yet. The tag starts the GitHub release build, which makes the direct-download installer public. Do that in Part 7, after the Store has approved the app.

## Part 3 — Open a developer account

You do not need a business email. An individual account uses a personal Microsoft account, and that can be created on any address, including Gmail.

1. If you have no Microsoft account, create one at <https://account.microsoft.com> with your personal email. Turn on two-step verification; Partner Center requires it.
2. Go to <https://storedeveloper.microsoft.com> and choose **Get started** → sign in → account type **Individual**.
   - Individual registration became free in 2025 in most countries. If the page asks for a one-time fee instead (about US$19 / roughly ₹1,500), that is the older route and it is still a one-time payment.
   - Do not choose **Company**: that needs a registered business and takes weeks to verify.
3. Identity check: you will be asked for a government photo ID and a selfie, or a card payment, depending on the route. Use your legal name here. It is not shown on the Store.
4. **Publisher display name:** enter `GlyphCode`. This is the name shown under the app in the Store. It must be unique; if it is taken, use `GlyphCode Studio`, and tell me, because the same text goes into the build.
5. Fill in the contact details and accept the App Developer Agreement.
6. Wait for the "account verified" email before continuing. This can take from a few minutes to a couple of days.

## Part 4 — Reserve the name and get the identity values

1. Open <https://partner.microsoft.com/dashboard> → **Apps and games** → **New product** → **MSIX or PWA app**.
2. Type `Kissa` → **Check availability** → **Reserve product name**.
   - If it is taken, reserve `Kissa – Vinyl Player`. The app's own window title does not need to change.
3. In the product's left menu open **Product management → Product identity**. Copy three lines:

   | Partner Center shows | Goes into `apps/desktop/electron-builder.yml` |
   | :--- | :--- |
   | Package/Identity/Name | `appx.identityName` |
   | Package/Identity/Publisher (starts with `CN=`) | `appx.publisher` |
   | Package/Properties/PublisherDisplayName | `appx.publisherDisplayName` |

4. Paste them into `electron-builder.yml`, replacing the placeholder values exactly, character for character (or send them to me and I will do it and rebuild).
5. Rebuild, from `apps/desktop`:

   ```bash
   npm run build:store
   ```

   The file to upload is `apps/desktop/dist/Kissa-Store-4.2.0.appx`. It is unsigned on purpose; Microsoft signs it. A package built before step 4 will be rejected at upload.
6. Commit and push that one-file change.

## Part 5 — Fill in the submission

In the product, choose **Start your submission**. Work down the sections; each turns green when complete.

**Pricing and availability**
- Markets: all. Visibility: **Public audience**. Schedule: as soon as it passes certification.
- Pricing: **Free**. Free trial: not applicable.

**Properties**
- Category: **Music**. No subcategory needed.
- "Does this product access, collect or transmit personal information?" → **Yes**, and paste the privacy policy URL from `STORE_LISTING.md`. (Kissa sends the title and artist of the current track to the lyrics and artwork services.)
- Website and support contact: from `STORE_LISTING.md`.
- System requirements: leave empty.

**Age ratings**
- Complete the questionnaire. Guidance for each answer is in `STORE_LISTING.md` under "Age rating questionnaire". Every content question is "No" except the one about unfiltered third-party content, because lyrics can be explicit.

**Packages**
- Drag in `Kissa-Store-4.2.0.appx`. Wait for validation to finish.
- Device families: leave **Windows 10/11 Desktop** ticked, untick anything else.
- A warning about the `runFullTrust` capability is normal for a desktop app. A notice about `unvirtualizedResources` is expected; it is handled under Submission options.

**Store listings → English (United States)**
- Description, "What's new", product features, short description and search terms: paste from `STORE_LISTING.md`.
- Screenshots: at least one, PNG, 1366×768 or larger. Four or five is better: main window, lyrics, a different room, the fullscreen display, the shelf. Add a one-line caption to each.
- Store logos: optional; the package already contains its tiles.
- Copyright: `© 2026 Naman Bagdiya (GlyphCode)`. Additional licence terms: paste the text of `LICENSE`.

**Submission options**
- **Restricted capabilities:** a box appears for `unvirtualizedResources`. Paste the justification from `MICROSOFT_STORE.md` ("The one thing that needs Microsoft's approval").
- **Notes for certification:** paste from `STORE_LISTING.md`. This tells the tester to start music first; without it they see an idle record and may fail the app as "does nothing".
- Publishing hold: **Publish as soon as it passes certification**.

Press **Submit to the Store**.

## Part 6 — Certification

- Usual time: a few hours to three business days. The restricted capability can add a few days on a first submission.
- You get an email either way, and the status is on the product's overview page.
- **If it fails**, the report names the policy and what the tester saw. Send it to me. The likely ones:
  - *Restricted capability not approved* → the fallback is already written up in `MICROSOFT_STORE.md` ("If Microsoft declines it"): the Store build ships without the one-click screensaver button, everything else unchanged.
  - *App does not appear to function* → the tester did not start music; resubmit with the certification notes made more prominent.
  - *Listing* problems (screenshot size, a claim in the description) → edit and resubmit; no new package needed.
- When it passes, the listing goes live within a few hours. Your Store link is on the overview page (**Product identity → Store URL**).

## Part 7 — After it is live

1. Send me the Store link. I will point the website's Download button at it and keep the direct installer as the second option.
2. Publish the direct download for people who prefer it:

   ```bash
   git tag v4.2.0
   ```
   ```bash
   git push origin v4.2.0
   ```

   The "Release Kissa" workflow builds the installer and portable `.exe` and attaches them to a GitHub release. Existing 4.1.0 users are offered the update from inside the app.
3. Website: record the captures listed in `apps/website/captures/README.md`, then in the GitHub repository open **Settings → Pages → Source: GitHub Actions**. The site deploys on the next push.
4. Later versions: bump the version, `npm run build:store`, open the product in Partner Center → **Update** → replace the package → submit. Updates usually certify faster than the first submission.

---

## About the licence

Kissa is now "free to use, source visible, not open source" (`LICENSE`). Three things to know:

- **Versions up to 4.1.0 were published as MIT.** That cannot be taken back for copies people already have. The new licence covers 4.2.0 onward.
- **A licence deters copying; it does not prevent it.** While the repository is public, anyone can read the code. If you want the code itself out of reach, make the repository private. The catch: the in-app updater and the website's download button both read releases from this public repository, so a private repo needs a small public "releases only" repository first. Ask me and I will set that up.
- This text was written to be clear, not reviewed by a lawyer. If Kissa starts to matter commercially, have one read it.
