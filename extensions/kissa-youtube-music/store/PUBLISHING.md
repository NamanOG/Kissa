# Publishing Kissa for YouTube Music (owner's checklist)

Nothing here has been done. Every account action needs the owner.

## What must happen before Kissa 4.4.0 can rely on it

1. **Push** `PRIVACY.md` with the add-on section, so the privacy-policy link works.
2. **Build the package:** `powershell -File extensions/kissa-youtube-music/store/package.ps1` produces `kissa-youtube-music-1.0.0.zip`.
3. **Chrome Web Store** (https://chrome.google.com/webstore/devconsole):
   - Register as a developer with a Google account. Google charges a **one-time registration fee** (historically US$5; the dashboard shows the current amount).
   - Declare **Trader or Non-Trader** (EU Digital Services Act). For a free personal project, Non-Trader is usually right, but it is your declaration to make. **If you declare Trader, your verified name, address, phone and email are shown publicly on the listing.**
   - Your developer **contact email** is shown on the listing in either case. Use one you are happy to make public.
   - Upload the zip, fill in the listing from `LISTING.md`, privacy practices, screenshots, then submit for review. Review usually takes a few days and can take longer for new developers.
4. **Microsoft Edge Add-ons** (Partner Center, https://partner.microsoft.com/dashboard/microsoftedge):
   - Free. Enrol in the Microsoft Edge program. Your existing Partner Center account (the one that publishes Kissa to the Microsoft Store) may be able to add it; otherwise register a new individual account.
   - The listing shows the **publisher display name** and website, and a support contact. Choose a display name you are happy to show (for example GlyphCode).
   - Upload the same zip, fill in the same listing, submit. Review usually takes up to about a week.
5. When each listing is live, put its URL in
   `apps/desktop/src/renderer/src/features/settings/youtubeMusicConnector.ts` (`CONNECTOR_STORE_LINKS`) so Kissa shows "Also share YouTube Music" and the install buttons. While both are empty, the option stays hidden.

## Personal information that becomes public

| Where | Shown publicly |
| :--- | :--- |
| Chrome Web Store | Developer/publisher name, contact email; if declared a Trader, also legal name, address and phone |
| Edge Add-ons | Publisher display name, website, support contact |
| Support page | UPI ID `glyphcode@upi` and payee name Naman, with its QR (decoded locally: `glyphcode@upi`, no fixed amount). Payment apps may still show the bank-registered recipient name. |

## Extension IDs and Kissa

- Each store assigns its own extension ID: Chrome's and Edge's will differ from each other and from a locally loaded copy.
- **Kissa does not depend on the ID.** The bridge refuses web pages and accepts requests with an extension origin or none. A connection is authorised only by the one-time pairing code and the token it issues. So publishing does not change origin checks, permissions or pairing; each browser simply pairs once.
- Optional hardening after both listings are live: accept only the two store IDs (plus a development ID).
- Optional: put the Chrome Web Store public key in `manifest.json` as `key` so a locally loaded copy uses the same ID as the published one.

## Update flow

Bump `version` in `manifest.json`, rebuild the zip, upload to both dashboards. Users update automatically.

## Honest limits

- The add-on reads YouTube Music's own page (media metadata and the ad marker). If YouTube Music changes, the add-on stops reporting and Kissa clears the track within 15 seconds. It never guesses.
- Tested: Chromium (Playwright build 1217) on Windows with a real Discord account, 19 Oct 2026. Pairing, play, pause and resume, closing the tab, ordinary YouTube ignored, and a restart all worked.
- **Not yet observed live:** an ad playing while sharing is on (covered by automated tests and the add-on's ad check), and installation in Microsoft Edge (to be checked with the packaged zip before submission).
